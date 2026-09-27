package com.donetick.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StrikethroughSpan;
import android.view.View;
import android.widget.RemoteViews;

import com.donetick.app.R;

import java.util.ArrayList;
import java.util.List;

/** Interactive project browser. Widget hosts do not expose horizontal swipe
 * callbacks, so previous/next provide the same navigation deterministically. */
public class ProjectWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_PREVIOUS = "com.donetick.app.widget.PROJECT_PREVIOUS";
    private static final String ACTION_NEXT = "com.donetick.app.widget.PROJECT_NEXT";
    private static final String ACTION_UP = "com.donetick.app.widget.PROJECT_UP";
    private static final String ACTION_DOWN = "com.donetick.app.widget.PROJECT_DOWN";
    private static final String ACTION_REFRESH = "com.donetick.app.widget.PROJECT_REFRESH";
    private static final String ACTION_COMPLETE = "com.donetick.app.widget.PROJECT_COMPLETE";
    private static final String EXTRA_TASK_ID = "task_id";
    private static final int PAGE_SIZE = 5;

    private static final int[] ROWS = { R.id.project_row_0, R.id.project_row_1,
            R.id.project_row_2, R.id.project_row_3, R.id.project_row_4 };
    private static final int[] CHECKS = { R.id.project_check_0, R.id.project_check_1,
            R.id.project_check_2, R.id.project_check_3, R.id.project_check_4 };
    private static final int[] TITLES = { R.id.project_task_0, R.id.project_task_1,
            R.id.project_task_2, R.id.project_task_3, R.id.project_task_4 };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(context, id));
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager,
                                           int appWidgetId, Bundle newOptions) {
        manager.updateAppWidget(appWidgetId, build(context, appWidgetId));
    }

    @Override
    public void onDeleted(Context context, int[] ids) {
        for (int id : ids) WidgetStore.removeWidgetOptions(context, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null || !action.startsWith("com.donetick.app.widget.PROJECT_")) return;
        int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID);
        if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;

        if (ACTION_REFRESH.equals(action) || ACTION_COMPLETE.equals(action)) {
            PendingResult pending = goAsync();
            new Thread(() -> {
                if (ACTION_COMPLETE.equals(action)) {
                    String taskId = intent.getStringExtra(EXTRA_TASK_ID);
                    if (taskId != null) WidgetStore.completeTask(context, taskId);
                } else {
                    WidgetStore.refreshFromServer(context, true);
                }
                update(context, id);
                pending.finish();
            }, "project-widget-action").start();
            return;
        }

        List<WidgetStore.Project> projects = WidgetStore.loadProjects(context);
        if (projects.isEmpty()) return;
        int index = Math.min(WidgetStore.projectIndex(context, id), projects.size() - 1);
        int page = WidgetStore.projectPage(context, id);
        if (ACTION_PREVIOUS.equals(action)) { index = (index - 1 + projects.size()) % projects.size(); page = 0; }
        if (ACTION_NEXT.equals(action)) { index = (index + 1) % projects.size(); page = 0; }
        if (ACTION_UP.equals(action)) page = Math.max(0, page - 1);
        if (ACTION_DOWN.equals(action)) {
            int taskCount = tasksFor(context, projects.get(index).id).size();
            page = Math.min(Math.max(0, (taskCount - 1) / PAGE_SIZE), page + 1);
        }
        WidgetStore.setProjectPosition(context, id, index, page);
        update(context, id);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, ProjectWidgetProvider.class));
        for (int id : ids) manager.updateAppWidget(id, build(context, id));
    }

    private static void update(Context context, int id) {
        AppWidgetManager.getInstance(context).updateAppWidget(id, build(context, id));
    }

    private static RemoteViews build(Context context, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_project);
        List<WidgetStore.Project> projects = WidgetStore.loadProjects(context);
        if (projects.isEmpty()) {
            WidgetStore.Project fallback = new WidgetStore.Project();
            fallback.id = "default"; fallback.name = "Projects"; fallback.color = "#64748B";
            projects.add(fallback);
        }
        int index = Math.min(WidgetStore.projectIndex(context, widgetId), projects.size() - 1);
        WidgetStore.Project project = projects.get(index);
        List<WidgetStore.ProjectTask> tasks = tasksFor(context, project.id);
        int maxPage = Math.max(0, (tasks.size() - 1) / PAGE_SIZE);
        int page = Math.min(WidgetStore.projectPage(context, widgetId), maxPage);
        if (page != WidgetStore.projectPage(context, widgetId)) {
            WidgetStore.setProjectPosition(context, widgetId, index, page);
        }

        int background = parseColor(project.color, Color.rgb(100, 116, 139));
        int foreground = contrastColor(background);
        int secondary = withAlphaOver(foreground, background, 0.72f);
        int completedBg = blend(background, foreground, 0.10f);
        views.setInt(R.id.project_widget_container, "setBackgroundColor", background);
        views.setTextColor(R.id.project_title, foreground);
        views.setTextColor(R.id.project_icon, foreground);
        views.setTextColor(R.id.project_counts, secondary);
        views.setTextViewText(R.id.project_title, project.name);
        views.setTextViewText(R.id.project_icon, icon(project.icon));
        String me = WidgetStore.userId(context);
        int mine = 0;
        for (WidgetStore.ProjectTask task : tasks) if (me != null && me.equals(task.assignedTo)) mine++;
        views.setTextViewText(R.id.project_counts, tasks.size() + " tasks · " + mine + " assigned to me");
        views.setTextColor(R.id.project_empty, secondary);

        int start = page * PAGE_SIZE;
        int visible = Math.min(PAGE_SIZE, Math.max(0, tasks.size() - start));
        for (int row = 0; row < PAGE_SIZE; row++) {
            views.setTextColor(CHECKS[row], foreground);
            views.setTextColor(TITLES[row], foreground);
            if (row < visible) {
                WidgetStore.ProjectTask task = tasks.get(start + row);
                views.setViewVisibility(ROWS[row], View.VISIBLE);
                views.setTextViewText(CHECKS[row], task.completed ? "✓" : "○");
                if (task.completed) {
                    SpannableString title = new SpannableString(task.name);
                    title.setSpan(new StrikethroughSpan(), 0, title.length(),
                            Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    views.setTextViewText(TITLES[row], title);
                } else {
                    views.setTextViewText(TITLES[row], task.name);
                }
                views.setInt(ROWS[row], "setBackgroundColor",
                        task.completed ? completedBg : Color.TRANSPARENT);
                if (!task.completed) {
                    views.setOnClickPendingIntent(CHECKS[row], action(context, widgetId,
                            ACTION_COMPLETE, task.id, 100 + row));
                }
            } else {
                views.setViewVisibility(ROWS[row], View.GONE);
            }
        }
        views.setViewVisibility(R.id.project_empty, tasks.isEmpty() ? View.VISIBLE : View.GONE);

        views.setTextColor(R.id.project_previous, foreground);
        views.setTextColor(R.id.project_next, foreground);
        views.setTextColor(R.id.project_refresh, foreground);
        views.setTextColor(R.id.project_up, foreground);
        views.setTextColor(R.id.project_down, foreground);
        views.setOnClickPendingIntent(R.id.project_previous, action(context, widgetId, ACTION_PREVIOUS, null, 1));
        views.setOnClickPendingIntent(R.id.project_next, action(context, widgetId, ACTION_NEXT, null, 2));
        views.setOnClickPendingIntent(R.id.project_refresh, action(context, widgetId, ACTION_REFRESH, null, 3));
        views.setOnClickPendingIntent(R.id.project_up, action(context, widgetId, ACTION_UP, null, 4));
        views.setOnClickPendingIntent(R.id.project_down, action(context, widgetId, ACTION_DOWN, null, 5));
        return views;
    }

    private static PendingIntent action(Context context, int widgetId, String action,
                                        String taskId, int offset) {
        Intent intent = new Intent(context, ProjectWidgetProvider.class);
        intent.setAction(action);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        if (taskId != null) intent.putExtra(EXTRA_TASK_ID, taskId);
        return PendingIntent.getBroadcast(context, widgetId * 1000 + offset, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static List<WidgetStore.ProjectTask> tasksFor(Context context, String projectId) {
        List<WidgetStore.ProjectTask> result = new ArrayList<>();
        for (WidgetStore.ProjectTask task : WidgetStore.loadProjectTasks(context)) {
            if (projectId.equals(task.projectId)) result.add(task);
        }
        return result;
    }

    private static String icon(String name) {
        if (name == null) return "●";
        if (name.contains("Home")) return "⌂";
        if (name.contains("Work") || name.contains("Business")) return "▣";
        if (name.contains("School") || name.contains("Book")) return "▤";
        if (name.contains("Shopping")) return "◆";
        if (name.contains("Fitness") || name.contains("Sports")) return "★";
        return "●";
    }

    private static int parseColor(String value, int fallback) {
        try { return Color.parseColor(value); } catch (Exception ignored) { return fallback; }
    }

    private static int contrastColor(int color) {
        double luminance = (0.2126 * Color.red(color) + 0.7152 * Color.green(color)
                + 0.0722 * Color.blue(color)) / 255.0;
        return luminance > 0.58 ? Color.rgb(20, 24, 28) : Color.WHITE;
    }

    private static int blend(int a, int b, float amount) {
        return Color.rgb((int)(Color.red(a) * (1 - amount) + Color.red(b) * amount),
                (int)(Color.green(a) * (1 - amount) + Color.green(b) * amount),
                (int)(Color.blue(a) * (1 - amount) + Color.blue(b) * amount));
    }

    private static int withAlphaOver(int foreground, int background, float alpha) {
        return blend(background, foreground, alpha);
    }
}
