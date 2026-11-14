package com.meuapp.objetividade.goal;

import com.meuapp.objetividade.user.User;
import com.meuapp.objetividade.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GoalService {

    // em andamento primeiro (prazo mais próximo no topo), depois as conquistadas (mais recentes primeiro)
    private static final Comparator<Goal> ORDER = Comparator
            .comparing((Goal g) -> g.getAchievedOn() != null)
            .thenComparing(g -> g.getAchievedOn() == null ? g.getDeadline() : LocalDate.MAX)
            .thenComparing(Goal::getAchievedOn, Comparator.nullsFirst(Comparator.reverseOrder()))
            .thenComparing(Goal::getCreatedAt, Comparator.reverseOrder());

    private final GoalRepository goals;
    private final UserRepository users;

    public GoalService(GoalRepository goals, UserRepository users) {
        this.goals = goals;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<GoalView> list(String email) {
        return goals.findByUser(user(email)).stream().sorted(ORDER).map(GoalView::of).toList();
    }

    @Transactional
    public GoalView create(String email, GoalRequest req) {
        Goal g = new Goal();
        g.setUser(user(email));
        apply(g, req);
        goals.saveAndFlush(g); // gera os ids dos subtópicos antes de devolver
        return GoalView.of(g);
    }

    @Transactional
    public GoalView update(String email, Long id, GoalRequest req) {
        Goal g = find(email, id);
        apply(g, req);
        goals.saveAndFlush(g);
        return GoalView.of(g);
    }

    @Transactional
    public GoalView setAchieved(String email, Long id, boolean achieved) {
        Goal g = find(email, id);
        g.setAchievedOn(achieved ? LocalDate.now() : null);
        return GoalView.of(g);
    }

    @Transactional
    public GoalView setStepDone(String email, Long id, Long stepId, boolean done) {
        Goal g = find(email, id);
        GoalStep step = g.getSteps().stream()
                .filter(s -> s.getId().equals(stepId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        step.setDone(done);
        return GoalView.of(g);
    }

    @Transactional
    public void delete(String email, Long id) {
        goals.delete(find(email, id));
    }

    private void apply(Goal g, GoalRequest req) {
        g.setTitle(req.title().trim());
        g.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        g.setDeadline(req.deadline());
        syncSteps(g, req.steps() == null ? List.of() : req.steps());
    }

    // atualiza os subtópicos pela lista recebida: mantém os que têm id, cria os novos e remove os que sumiram
    private void syncSteps(Goal g, List<GoalStepInput> inputs) {
        Map<Long, GoalStep> existing = new HashMap<>();
        for (GoalStep s : g.getSteps()) existing.put(s.getId(), s);

        List<GoalStep> next = new ArrayList<>();
        int position = 0;
        for (GoalStepInput in : inputs) {
            GoalStep s = in.id() == null ? null : existing.remove(in.id());
            if (s == null) s = new GoalStep(g, in.title().trim());
            s.setTitle(in.title().trim());
            s.setDone(Boolean.TRUE.equals(in.done()));
            s.setPosition(position++);
            next.add(s);
        }

        g.getSteps().clear();
        g.getSteps().addAll(next);
    }

    private Goal find(String email, Long id) {
        return goals.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private User user(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
