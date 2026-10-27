package com.meuapp.todolist.task;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService service;

    public TagController(TagService service) {
        this.service = service;
    }

    @GetMapping
    public List<TagView> list(Principal principal) {
        return service.list(principal.getName());
    }

    @PostMapping
    public ResponseEntity<TagView> create(@Valid @RequestBody CreateTagRequest body, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getName(), body));
    }
}