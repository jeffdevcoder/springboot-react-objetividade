package com.meuapp.objetividade.study;

import jakarta.validation.constraints.Size;

public record SessionDescriptionRequest(@Size(max = 120) String description) {}
