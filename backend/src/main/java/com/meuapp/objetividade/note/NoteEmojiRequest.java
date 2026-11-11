package com.meuapp.objetividade.note;

import jakarta.validation.constraints.Size;

public record NoteEmojiRequest(@Size(max = 16) String emoji) {}
