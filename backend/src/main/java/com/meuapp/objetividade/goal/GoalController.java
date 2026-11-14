package com.meuapp.objetividade.goal;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService service;

    public GoalController(GoalService service) {
        this.service = service;
    }

    @GetMapping
    public List<GoalView> list(Principal principal) {
        return service.list(principal.getName());
    }

    @PostMapping
    public ResponseEntity<GoalView> create(@Valid @RequestBody GoalRequest body, Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(principal.getName(), body));
    }

    @PutMapping("/{id}")
    public GoalView update(@PathVariable Long id, @Valid @RequestBody GoalRequest body, Principal principal) {
        return service.update(principal.getName(), id, body);
    }

    @PatchMapping("/{id}/achieved")
    public GoalView setAchieved(@PathVariable Long id, @RequestBody GoalAchievedRequest body, Principal principal) {
        return service.setAchieved(principal.getName(), id, body.achieved());
    }

    @PatchMapping("/{id}/steps/{stepId}")
    public GoalView setStepDone(@PathVariable Long id, @PathVariable Long stepId,
                                @RequestBody GoalStepDoneRequest body, Principal principal) {
        return service.setStepDone(principal.getName(), id, stepId, body.done());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        service.delete(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
