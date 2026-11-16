package com.meuapp.objetividade.finance;

import com.meuapp.objetividade.user.User;
import com.meuapp.objetividade.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FinanceService {

    private final TransactionRepository repository;
    private final RecurringTransactionRepository recurringRepo;
    private final FinanceCategoryRepository categoryRepo;
    private final RecurringPaymentRepository paymentRepo;
    private final UserRepository users;

    public FinanceService(TransactionRepository repository,
                          RecurringTransactionRepository recurringRepo,
                          FinanceCategoryRepository categoryRepo,
                          RecurringPaymentRepository paymentRepo,
                          UserRepository users) {
        this.repository = repository;
        this.recurringRepo = recurringRepo;
        this.categoryRepo = categoryRepo;
        this.paymentRepo = paymentRepo;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<TransactionView> month(String email, YearMonth month) {
        User user = user(email);

        List<Transaction> txs = repository.findByUserAndDateBetweenOrderByDateDescIdDesc(
                user, month.atDay(1), month.atEndOfMonth());

        Set<String> groups = txs.stream().map(Transaction::getInstallmentGroup)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, Integer> paid = new HashMap<>();
        if (!groups.isEmpty()) {
            LocalDate today = LocalDate.now();
            for (Transaction g : repository.findByUserAndInstallmentGroupIn(user, groups)) {
                if (!g.getDate().isAfter(today)) paid.merge(g.getInstallmentGroup(), 1, Integer::sum);
            }
        }

        List<TransactionView> result = new ArrayList<>(txs.stream()
                .map(t -> TransactionView.of(t, t.getInstallmentGroup() == null
                        ? null : paid.getOrDefault(t.getInstallmentGroup(), 0)))
                .toList());

        LocalDate monthStart = month.atDay(1);
        List<RecurringTransaction> active = recurringRepo.findByUser(user).stream()
                .filter(r -> !r.getStartMonth().isAfter(monthStart))
                .filter(r -> r.getEndMonth() == null || !r.getEndMonth().isBefore(monthStart))
                .toList();
        Set<Long> paidRecurring = active.isEmpty() ? Set.of()
                : paymentRepo.findByRecurringInAndMonth(active, monthStart).stream()
                        .map(p -> p.getRecurring().getId())
                        .collect(Collectors.toSet());
        for (RecurringTransaction r : active) {
            int day = Math.min(r.getDayOfMonth(), month.lengthOfMonth());
            result.add(TransactionView.ofRecurring(r, month.atDay(day), paidRecurring.contains(r.getId())));
        }

        result.sort(Comparator.comparing(TransactionView::date).reversed());
        return result;
    }

    @Transactional
    public TransactionView create(String email, CreateTransactionRequest req) {
        User user = user(email);

        String description = req.description() == null ? "" : req.description().trim();
        if (description.isEmpty() && req.categoryId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe a descrição ou escolha uma categoria");
        }

        FinanceCategory category = null;
        if (req.categoryId() != null) {
            category = categoryRepo.findByIdAndUser(req.categoryId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (category.getType() != req.type()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Essa categoria é de " + label(category.getType()));
            }
        }

        LocalDate date = req.date() != null ? req.date() : LocalDate.now();

        int n = req.installments() == null ? 1 : req.installments();
        if (n > 1 && req.type() == TransactionType.INCOME) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Parcelas só são permitidas em gastos");
        }
        if (n > 1 && req.monthly()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Parcelado e fixo mensal não podem ser usados juntos");
        }

        if (n > 1) {
            String group = UUID.randomUUID().toString();
            Transaction first = null;
            for (int i = 0; i < n; i++) {
                Transaction t = new Transaction();
                t.setUser(user);
                t.setType(req.type());
                t.setAmountCents(req.amountCents());
                t.setDescription(description);
                t.setCategory(category);
                t.setDate(date.plusMonths(i));
                t.setInstallmentGroup(group);
                t.setInstallmentNumber(i + 1);
                t.setInstallmentTotal(n);
                repository.save(t);
                if (first == null) first = t;
            }
            return TransactionView.of(first);
        }

        if (req.monthly()) {
            RecurringTransaction r = new RecurringTransaction();
            r.setUser(user);
            r.setType(req.type());
            r.setAmountCents(req.amountCents());
            r.setDescription(description);
            r.setCategory(category);
            r.setDayOfMonth(date.getDayOfMonth());
            r.setStartMonth(date.withDayOfMonth(1));
            recurringRepo.save(r);
            return TransactionView.ofRecurring(r, date);
        }

        Transaction t = new Transaction();
        t.setUser(user);
        t.setType(req.type());
        t.setAmountCents(req.amountCents());
        t.setDescription(description);
        t.setCategory(category);
        t.setDate(date);
        repository.save(t);
        return TransactionView.of(t);
    }

    @Transactional
    public void delete(String email, Long id) {
        User user = user(email);
        Transaction t = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (t.getInstallmentGroup() != null) {
            List<Transaction> group = repository.findByUserAndInstallmentGroup(user, t.getInstallmentGroup());
            group.forEach(x -> beforeDelete(user, x));
            repository.deleteAll(group);
        } else {
            beforeDelete(user, t);
            repository.delete(t);
        }
    }

    @Transactional
    public void endRecurring(String email, Long id, YearMonth from) {
        RecurringTransaction r = recurringRepo.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        endSeriesBefore(r, from);
    }

    @Transactional
    public TransactionView setPaid(String email, Long id, boolean paid) {
        Transaction t = repository.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireExpense(t.getType());
        markPaid(t, paid);
        return TransactionView.of(t);
    }

    @Transactional
    public TransactionView setRecurringPaid(String email, Long id, YearMonth month, boolean paid) {
        RecurringTransaction r = recurringRepo.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireExpense(r.getType());

        LocalDate monthStart = month.atDay(1);
        boolean active = !r.getStartMonth().isAfter(monthStart)
                && (r.getEndMonth() == null || !r.getEndMonth().isBefore(monthStart));
        if (!active) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Esse gasto fixo não existe nesse mês");
        }

        int day = Math.min(r.getDayOfMonth(), month.lengthOfMonth());
        LocalDate date = month.atDay(day);

        Optional<RecurringPayment> existing = paymentRepo.findByRecurringAndMonth(r, monthStart);
        if (paid && existing.isEmpty()) {
            RecurringPayment p = new RecurringPayment();
            p.setRecurring(r);
            p.setMonth(monthStart);
            p.setIncomeId(createPaidIncome(r.getUser(), r.getAmountCents(),
                    paidLabel(r.getDescription(), r.getCategory())).getId());
            paymentRepo.save(p);
        } else if (!paid) {
            existing.ifPresent(this::dropPayment);
        }

        return TransactionView.ofRecurring(r, date, paid);
    }

    // ---- receita automática "Contas pagas" ----

    private static final String PAID_CATEGORY = "Contas pagas";
    private static final String PAID_EMOJI = "✅";
    private static final String PAID_PREFERRED_COLOR = "#10B981";

    /** Marca/desmarca um gasto comum ou parcela, criando/removendo a receita "Contas pagas". */
    private void markPaid(Transaction t, boolean paid) {
        if (paid) {
            if (t.getPaidIncomeId() == null || repository.findById(t.getPaidIncomeId()).isEmpty()) {
                Transaction income = createPaidIncome(t.getUser(), t.getAmountCents(),
                        paidLabel(t.getDescription(), t.getCategory()));
                t.setPaidIncomeId(income.getId());
            } else {
                syncPaidIncome(t);
            }
            t.setPaid(true);
        } else {
            if (t.getPaidIncomeId() != null) {
                repository.findById(t.getPaidIncomeId()).ifPresent(repository::delete);
                t.setPaidIncomeId(null);
            }
            t.setPaid(false);
        }
    }

    /** Mantém a receita automática com o mesmo valor do gasto (a data continua a do pagamento). */
    private void syncPaidIncome(Transaction t) {
        if (!t.isPaid() || t.getPaidIncomeId() == null) return;
        repository.findById(t.getPaidIncomeId())
                .ifPresent(income -> income.setAmountCents(t.getAmountCents()));
    }

    /** Limpa os vínculos de pagamento antes de excluir um lançamento. */
    private void beforeDelete(User user, Transaction t) {
        if (t.getType() == TransactionType.EXPENSE) {
            markPaid(t, false);
            return;
        }
        // é uma receita automática? o gasto correspondente volta a ficar pendente
        repository.findFirstByUserAndPaidIncomeId(user, t.getId()).ifPresent(expense -> {
            expense.setPaidIncomeId(null);
            expense.setPaid(false);
        });
        paymentRepo.findByIncomeId(t.getId()).ifPresent(paymentRepo::delete);
    }

    private void dropPayment(RecurringPayment p) {
        if (p.getIncomeId() != null) repository.findById(p.getIncomeId()).ifPresent(repository::delete);
        paymentRepo.delete(p);
    }

    /** Remove os pagamentos do fixo a partir de {@code fromMonth} (todos, se null). */
    private void dropPayments(RecurringTransaction r, LocalDate fromMonth) {
        for (RecurringPayment p : paymentRepo.findByRecurring(r)) {
            if (fromMonth == null || !p.getMonth().isBefore(fromMonth)) dropPayment(p);
        }
    }

    /** Após editar um fixo, ajusta o valor das receitas automáticas dos meses afetados. */
    private void syncRecurringPayments(RecurringTransaction r, LocalDate fromMonth) {
        for (RecurringPayment p : paymentRepo.findByRecurring(r)) {
            if (p.getMonth().isBefore(fromMonth)) continue;
            if (p.getMonth().isBefore(r.getStartMonth())
                    || (r.getEndMonth() != null && p.getMonth().isAfter(r.getEndMonth()))) {
                dropPayment(p);
                continue;
            }
            if (p.getIncomeId() == null) continue;
            repository.findById(p.getIncomeId())
                    .ifPresent(income -> income.setAmountCents(r.getAmountCents()));
        }
    }

    /** A receita entra com a data de hoje: o dia em que a conta foi paga. */
    private Transaction createPaidIncome(User user, long amountCents, String description) {
        FinanceCategory category = paidCategory(user);
        Transaction income = new Transaction();
        income.setUser(user);
        income.setType(TransactionType.INCOME);
        income.setAmountCents(amountCents);
        income.setDescription(category == null && description.isEmpty() ? PAID_CATEGORY : description);
        income.setCategory(category);
        income.setDate(LocalDate.now());
        return repository.save(income);
    }

    /** Categoria de receita "Contas pagas", criada na primeira vez que for necessária. */
    private FinanceCategory paidCategory(User user) {
        Optional<FinanceCategory> existing = categoryRepo.findFirstByUserAndNameIgnoreCase(user, PAID_CATEGORY);
        if (existing.isPresent()) {
            return existing.get().getType() == TransactionType.INCOME ? existing.get() : null;
        }

        Set<String> taken = categoryRepo.findByUserOrderByIdAsc(user).stream()
                .map(c -> c.getColor().toUpperCase())
                .collect(Collectors.toSet());
        List<String> colors = new ArrayList<>(new TreeSet<>(FinancePalette.INCOME));
        colors.remove(PAID_PREFERRED_COLOR);
        colors.add(0, PAID_PREFERRED_COLOR);
        String color = colors.stream().filter(c -> !taken.contains(c)).findFirst().orElse(null);
        if (color == null) return null;

        FinanceCategory c = new FinanceCategory();
        c.setUser(user);
        c.setType(TransactionType.INCOME);
        c.setName(PAID_CATEGORY);
        c.setEmoji(PAID_EMOJI);
        c.setColor(color);
        return categoryRepo.save(c);
    }

    private String paidLabel(String description, FinanceCategory category) {
        if (description != null && !description.isBlank()) return description;
        return category != null ? category.getName() : "";
    }

    private void requireExpense(TransactionType type) {
        if (type != TransactionType.EXPENSE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Apenas gastos podem ser marcados como pagos");
        }
    }

    @Transactional(readOnly = true)
    public List<CategoryView> categories(String email) {
        return categoryRepo.findByUserOrderByIdAsc(user(email)).stream().map(CategoryView::of).toList();
    }

    @Transactional
    public CategoryView createCategory(String email, CreateCategoryRequest req) {
        User user = user(email);
        String name = cleanName(req.name());
        String color = req.color().toUpperCase();
        validateCategory(user, req.type(), name, color, null);

        FinanceCategory c = new FinanceCategory();
        c.setUser(user);
        c.setType(req.type());
        c.setName(name);
        c.setEmoji(req.emoji().trim());
        c.setColor(color);
        categoryRepo.save(c);
        return CategoryView.of(c);
    }

    @Transactional
    public CategoryView updateCategory(String email, Long id, UpdateCategoryRequest req) {
        User user = user(email);
        FinanceCategory c = categoryRepo.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        String name = cleanName(req.name());
        String color = req.color().toUpperCase();
        validateCategory(user, c.getType(), name, color, id);

        c.setName(name);
        c.setEmoji(req.emoji().trim());
        c.setColor(color);
        return CategoryView.of(c);
    }

    @Transactional
    public void deleteCategory(String email, Long id) {
        FinanceCategory c = categoryRepo.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repository.clearCategory(c);
        recurringRepo.clearCategory(c);
        categoryRepo.delete(c);
    }

    private void validateCategory(User user, TransactionType type, String name, String color, Long selfId) {
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome da categoria");
        }
        if (!FinancePalette.allows(type, color)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Essa cor não é permitida para " + (type == TransactionType.INCOME ? "receitas" : "gastos"));
        }
        long exclude = selfId == null ? -1L : selfId;
        if (categoryRepo.existsByUserAndNameIgnoreCaseAndIdNot(user, name, exclude)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma categoria com esse nome");
        }
        if (categoryRepo.existsByUserAndColorIgnoreCaseAndIdNot(user, color, exclude)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Essa cor já está em uso");
        }
    }

    @Transactional
    public TransactionView update(String email, Long id, CreateTransactionRequest req) {
        User user = user(email);
        Transaction t = repository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        FinanceCategory category = resolveCategory(user, req);
        String description = requireDescriptionOrCategory(req, category);
        LocalDate date = req.date() != null ? req.date() : t.getDate();

        if (req.monthly() && t.getInstallmentGroup() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Uma parcela não pode virar lançamento fixo");
        }

        if (req.monthly()) {
            beforeDelete(user, t);
            repository.delete(t);
            RecurringTransaction r = newRecurring(user, req, category, description, date);
            recurringRepo.save(r);
            return TransactionView.ofRecurring(r, date);
        }

        t.setType(req.type());
        if (req.type() != TransactionType.EXPENSE) markPaid(t, false);
        t.setAmountCents(req.amountCents());
        t.setDescription(description);
        t.setCategory(category);
        t.setDate(date);
        if (t.getInstallmentGroup() != null) {
            Integer newTotal = req.installments();
            if (newTotal != null && !newTotal.equals(t.getInstallmentTotal())) {
                resizeInstallments(user, t, newTotal);
            }
            redateInstallments(user, t, date);
        }
        syncPaidIncome(t);
        return TransactionView.of(t);
    }

    @Transactional
    public TransactionView updateRecurring(String email, Long id, YearMonth from, CreateTransactionRequest req) {
        User user = user(email);
        RecurringTransaction old = recurringRepo.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        FinanceCategory category = resolveCategory(user, req);
        String description = requireDescriptionOrCategory(req, category);

        if (!req.monthly()) {
            LocalDate date = req.date() != null
                    ? req.date()
                    : from.atDay(Math.min(old.getDayOfMonth(), from.lengthOfMonth()));

            endSeriesBefore(old, from);

            Transaction t = new Transaction();
            t.setUser(user);
            t.setType(req.type());
            t.setAmountCents(req.amountCents());
            t.setDescription(description);
            t.setCategory(category);
            t.setDate(date);
            repository.save(t);
            return TransactionView.of(t);
        }

        // continua fixo: a data escolhida vira o novo início
        LocalDate fromStart = from.atDay(1);
        LocalDate newStart = req.date() != null ? req.date().withDayOfMonth(1) : fromStart;
        int day = req.date() != null ? req.date().getDayOfMonth() : old.getDayOfMonth();

        RecurringTransaction target = old; // no primeiro mês, edita o próprio fixo
        if (fromStart.isAfter(old.getStartMonth()) && !newStart.isBefore(fromStart)) {
            LocalDate oldEnd = old.getEndMonth();
            dropPayments(old, fromStart);
            old.setEndMonth(from.minusMonths(1).atDay(1));

            target = new RecurringTransaction();
            target.setUser(user);
            target.setEndMonth(oldEnd);
        }

        target.setStartMonth(newStart);
        target.setType(req.type());
        target.setAmountCents(req.amountCents());
        target.setDescription(description);
        target.setCategory(category);
        target.setDayOfMonth(day);
        recurringRepo.save(target);
        if (target == old) syncRecurringPayments(target, fromStart);

        LocalDate shown = req.date() != null
                ? req.date()
                : from.atDay(Math.min(day, from.lengthOfMonth()));
        return TransactionView.ofRecurring(target, shown);
    }

    private RecurringTransaction newRecurring(User user, CreateTransactionRequest req,
                                              FinanceCategory category, String description, LocalDate date) {
        RecurringTransaction r = new RecurringTransaction();
        r.setUser(user);
        r.setType(req.type());
        r.setAmountCents(req.amountCents());
        r.setDescription(description);
        r.setCategory(category);
        r.setDayOfMonth(date.getDayOfMonth());
        r.setStartMonth(date.withDayOfMonth(1));
        return r;
    }

    private void redateInstallments(User user, Transaction current, LocalDate date) {
        for (Transaction x : repository.findByUserAndInstallmentGroup(user, current.getInstallmentGroup())) {
            x.setDate(date.plusMonths(x.getInstallmentNumber() - current.getInstallmentNumber()));
            syncPaidIncome(x);
        }
    }

    private void resizeInstallments(User user, Transaction current, int newTotal) {
        if (newTotal < current.getInstallmentNumber()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O total não pode ser menor que a parcela atual (" + current.getInstallmentNumber() + ")");
        }

        List<Transaction> group = new ArrayList<>(
                repository.findByUserAndInstallmentGroup(user, current.getInstallmentGroup()));
        group.sort(Comparator.comparing(Transaction::getInstallmentNumber));

        Transaction first = group.get(0);
        Transaction last = group.get(group.size() - 1);
        int oldTotal = last.getInstallmentNumber();

        if (newTotal < oldTotal) {
            for (Transaction x : group) {
                if (x.getInstallmentNumber() > newTotal) {
                    beforeDelete(user, x);
                    repository.delete(x);
                }
            }
        } else {
            for (int i = oldTotal + 1; i <= newTotal; i++) {
                Transaction n = new Transaction();
                n.setUser(user);
                n.setType(last.getType());
                n.setAmountCents(last.getAmountCents());
                n.setDescription(last.getDescription());
                n.setCategory(last.getCategory());
                n.setDate(first.getDate().plusMonths(i - 1));
                n.setInstallmentGroup(last.getInstallmentGroup());
                n.setInstallmentNumber(i);
                n.setInstallmentTotal(newTotal);
                repository.save(n);
            }
        }

        for (Transaction x : group) {
            if (x.getInstallmentNumber() <= newTotal) x.setInstallmentTotal(newTotal);
        }
    }

    private void endSeriesBefore(RecurringTransaction r, YearMonth from) {
        if (!from.atDay(1).isAfter(r.getStartMonth())) {
            dropPayments(r, null);
            recurringRepo.delete(r);
        } else {
            dropPayments(r, from.atDay(1));
            r.setEndMonth(from.minusMonths(1).atDay(1));
        }
    }

    private FinanceCategory resolveCategory(User user, CreateTransactionRequest req) {
        if (req.categoryId() == null) return null;

        FinanceCategory category = categoryRepo.findByIdAndUser(req.categoryId(), user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (category.getType() != req.type()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Essa categoria é de " + label(category.getType()));
        }
        return category;
    }

    private String requireDescriptionOrCategory(CreateTransactionRequest req, FinanceCategory category) {
        String description = req.description() == null ? "" : req.description().trim();
        if (description.isEmpty() && category == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe a descrição ou escolha uma categoria");
        }
        return description;
    }

    private String cleanName(String name) {
        return name.trim().replaceAll("\\s+", " ");
    }

    private String label(TransactionType type) {
        return type == TransactionType.INCOME ? "receita" : "gasto";
    }

    private User user(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}