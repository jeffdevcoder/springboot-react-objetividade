package com.meuapp.todolist.finance;

import com.meuapp.todolist.user.User;
import com.meuapp.todolist.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class FinanceService {

    private final TransactionRepository repository;
    private final RecurringTransactionRepository recurringRepo;
    private final FinanceCategoryRepository categoryRepo;
    private final UserRepository users;

    public FinanceService(TransactionRepository repository,
                          RecurringTransactionRepository recurringRepo,
                          FinanceCategoryRepository categoryRepo,
                          UserRepository users) {
        this.repository = repository;
        this.recurringRepo = recurringRepo;
        this.categoryRepo = categoryRepo;
        this.users = users;
    }

    // ---------- lançamentos ----------

    @Transactional(readOnly = true)
    public List<TransactionView> month(String email, YearMonth month) {
        User user = user(email);

        List<TransactionView> result = new ArrayList<>(
                repository.findByUserAndDateBetweenOrderByDateDescIdDesc(
                                user, month.atDay(1), month.atEndOfMonth())
                        .stream().map(TransactionView::of).toList());

        // fixos mensais que valem neste mês
        LocalDate monthStart = month.atDay(1);
        for (RecurringTransaction r : recurringRepo.findByUser(user)) {
            boolean started = !r.getStartMonth().isAfter(monthStart);
            boolean ended = r.getEndMonth() != null && r.getEndMonth().isBefore(monthStart);
            if (started && !ended) {
                int day = Math.min(r.getDayOfMonth(), month.lengthOfMonth());
                result.add(TransactionView.ofRecurring(r, month.atDay(day)));
            }
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
        Transaction t = repository.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repository.delete(t);
    }

    @Transactional
    public void endRecurring(String email, Long id, YearMonth from) {
        RecurringTransaction r = recurringRepo.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!from.atDay(1).isAfter(r.getStartMonth())) {
            recurringRepo.delete(r); // era o primeiro mês: some por completo
        } else {
            r.setEndMonth(from.minusMonths(1).atDay(1));
        }
    }

    // ---------- categorias ----------

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
        repository.clearCategory(c);     // os lançamentos ficam, só perdem a categoria
        recurringRepo.clearCategory(c);  // os fixos também
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

        if (req.monthly()) {
            repository.delete(t);
            RecurringTransaction r = newRecurring(user, req, category, description, date);
            recurringRepo.save(r);
            return TransactionView.ofRecurring(r, date);
        }

        t.setType(req.type());
        t.setAmountCents(req.amountCents());
        t.setDescription(description);
        t.setCategory(category);
        t.setDate(date);
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

        // continua fixo: a mudança vale deste mês em diante
        LocalDate fromStart = from.atDay(1);
        int day = req.date() != null ? req.date().getDayOfMonth() : old.getDayOfMonth();

        RecurringTransaction target = old; // no primeiro mês, edita o próprio fixo
        if (fromStart.isAfter(old.getStartMonth())) {
            LocalDate oldEnd = old.getEndMonth();
            old.setEndMonth(from.minusMonths(1).atDay(1));

            target = new RecurringTransaction();
            target.setUser(user);
            target.setStartMonth(fromStart);
            target.setEndMonth(oldEnd);
        }

        target.setType(req.type());
        target.setAmountCents(req.amountCents());
        target.setDescription(description);
        target.setCategory(category);
        target.setDayOfMonth(day);
        recurringRepo.save(target);

        return TransactionView.ofRecurring(target, from.atDay(Math.min(day, from.lengthOfMonth())));
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

    private void endSeriesBefore(RecurringTransaction r, YearMonth from) {
        if (!from.atDay(1).isAfter(r.getStartMonth())) {
            recurringRepo.delete(r);
        } else {
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