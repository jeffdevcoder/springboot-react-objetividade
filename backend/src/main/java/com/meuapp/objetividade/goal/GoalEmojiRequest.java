package com.meuapp.objetividade.goal;

import jakarta.validation.constraints.Size;

public record GoalEmojiRequest(@Size(max = 16) String emoji) {}
