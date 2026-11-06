package com.meuapp.todolist.study;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/study")
public class StudyController {

    private final StudyService service;

    public StudyController(StudyService service) {
        this.service = service;
    }

    @GetMapping("/subjects")
    public List<SubjectView> subjects(Principal principal) {
        return service.subjects(principal.getName());
    }

    @PostMapping("/subjects")
    public ResponseEntity<SubjectView> createSubject(@Valid @RequestBody SubjectRequest body, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createSubject(principal.getName(), body));
    }

    @PutMapping("/subjects/{id}")
    public SubjectView updateSubject(@PathVariable Long id, @Valid @RequestBody SubjectRequest body,
                                     Principal principal) {
        return service.updateSubject(principal.getName(), id, body);
    }

    @DeleteMapping("/subjects/{id}")
    public ResponseEntity<Void> deleteSubject(@PathVariable Long id, Principal principal) {
        service.deleteSubject(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sessions")
    public ResponseEntity<SessionView> addSession(@Valid @RequestBody SessionRequest body, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addSession(principal.getName(), body));
    }

    @GetMapping("/sessions")
    public List<SessionView> sessions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Principal principal) {
        return service.sessions(principal.getName(), from, to);
    }
}