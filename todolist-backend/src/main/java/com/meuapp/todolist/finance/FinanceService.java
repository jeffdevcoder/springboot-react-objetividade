package com.meuapp.todolist.finance;

import com.meuapp.todolist.user.User;
import com.meuapp.todolist.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public class FinanceService {

    private final TransactionRepository repository;
    private final FinanceCategoryRepository categoryRepo;
    private final UserRepository users;

    public FinanceService(TransactionRepository repository,
                          FinanceCategoryRepository categoryRepo,
                          UserRepository users) {
        this.repository = repository;
        this.categoryRepo = categoryRepo;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<TransactionView> month(String email, YearMonth month) {
        return repository
                .findByUserAndDateBetweenOrderByDateDescIdDesc(
                        user(email), month.atDay(1), month.atEndOfMonth())
                .stream().map(TransactionView::of).toList();
    }

    @Transactional
    public TransactionView create(String email, CreateTransactionRequest req) {
        User user = user(email);

        FinanceCategory category = null;
        if (req.categoryId() != null) {
            category = categoryRepo.findByIdAndUser(req.categoryId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        }

        Transaction t = new Transaction();
        t.setUser(user);
        t.setType(req.type());
        t.setAmountCents(req.amountCents());
        t.setDescription(req.description().trim());
        t.setCategory(category);
        t.setDate(req.date() != null ? req.date() : LocalDate.now());
        repository.save(t);
        return TransactionView.of(t);
    }

    @Transactional
    public void delete(String email, Long id) {
        Transaction t = repository.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        repository.delete(t);
    }

    @Transactional(readOnly = true)
    public List<CategoryView> categories(String email) {
        return categoryRepo.findByUserOrderByIdAsc(user(email)).stream().map(CategoryView::of).toList();
    }

    @Transactional
    public CategoryView createCategory(String email, CreateCategoryRequest req) {
        User user = user(email);
        String name = req.name().trim().replaceAll("\\s+", " ");

        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome da categoria");
        }
        if (categoryRepo.existsByUserAndNameIgnoreCase(user, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma categoria com esse nome");
        }

        FinanceCategory c = new FinanceCategory();
        c.setUser(user);
        c.setName(name);
        c.setEmoji(req.emoji().trim());
        c.setColor(req.color().toUpperCase());
        categoryRepo.save(c);
        return CategoryView.of(c);
    }

    private User user(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}