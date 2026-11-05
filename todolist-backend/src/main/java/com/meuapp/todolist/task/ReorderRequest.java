package com.meuapp.todolist.task;

import java.util.List;

public record ReorderRequest(List<Long> ids) {}