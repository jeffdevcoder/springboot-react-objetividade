package com.meuapp.objetividade.note;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteService service;

    public NoteController(NoteService service) {
        this.service = service;
    }

    @GetMapping
    public List<NoteView> list(Principal principal) {
        return service.list(principal.getName());
    }

    @PostMapping
    public ResponseEntity<NoteView> create(@Valid @RequestBody NoteRequest body, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getName(), body));
    }

    @PutMapping("/{id}")
    public NoteView update(@PathVariable Long id, @Valid @RequestBody NoteRequest body, Principal principal) {
        return service.update(principal.getName(), id, body);
    }

    @PatchMapping("/{id}/emoji")
    public ResponseEntity<Void> setEmoji(@PathVariable Long id, @Valid @RequestBody NoteEmojiRequest body,
                                         Principal principal) {
        service.setEmoji(principal.getName(), id, body.emoji());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        service.delete(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
