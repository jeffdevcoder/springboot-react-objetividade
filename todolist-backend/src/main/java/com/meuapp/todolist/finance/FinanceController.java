package com.meuapp.todolist.finance;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

    private final FinanceService service;

    public FinanceController(FinanceService service) {
        this.service = service;
    }

    @GetMapping("/transactions")
    public List<TransactionView> month(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
            Principal principal) {
        return service.month(principal.getName(), month);
    }

    @PostMapping("/transactions")
    public ResponseEntity<TransactionView> create(@Valid @RequestBody CreateTransactionRequest body,
                                                  Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getName(), body));
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        service.delete(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories")
    public List<CategoryView> categories(Principal principal) {
        return service.categories(principal.getName());
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryView> createCategory(@Valid @RequestBody CreateCategoryRequest body,
                                                       Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCategory(principal.getName(), body));
    }
}