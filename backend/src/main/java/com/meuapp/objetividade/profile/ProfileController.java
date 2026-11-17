package com.meuapp.objetividade.profile;

import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileStatsService stats;

    public ProfileController(ProfileStatsService stats) {
        this.stats = stats;
    }

    /** Estatísticas de todas as áreas na semana, no mês ou no ano atual (period = week | month | year). */
    @GetMapping("/stats")
    public ProfileStatsView stats(@RequestParam(defaultValue = "week") String period, Principal principal) {
        return stats.stats(principal.getName(), period);
    }
}
