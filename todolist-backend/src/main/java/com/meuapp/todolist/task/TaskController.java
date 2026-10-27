package com.meuapp.todolist.task;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping("/today")
    public List<TaskView> today(Principal principal) {
        return service.today(principal.getName());
    }

    @PostMapping
    public ResponseEntity<TaskView> create(@Valid @RequestBody CreateTaskRequest body, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getName(), body));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Void> complete(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Principal principal) {
        service.complete(principal.getName(), id, date);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/complete")
    public ResponseEntity<Void> uncomplete(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Principal principal) {
        service.uncomplete(principal.getName(), id, date);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/tag")
    public ResponseEntity<Void> assignTag(@PathVariable Long id,
                                          @RequestBody AssignTagRequest body,
                                          Principal principal) {
        service.assignTag(principal.getName(), id, body.tagId());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public TaskView update(@PathVariable Long id,
                           @Valid @RequestBody CreateTaskRequest body,
                           Principal principal) {
        return service.update(principal.getName(), id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        service.delete(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/day")
    public List<TaskView> day(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Principal principal) {
        return service.forDate(principal.getName(), date);
    }
}