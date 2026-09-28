package com.donetick.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Shared storage + refresh logic for the home-screen widgets.
 *
 * The web app pushes a pre-filtered snapshot through WidgetBridgePlugin
 * whenever its chores cache changes. When the app has not run for a while,
 * {@link #refreshFromServerIfStale} re-fetches the list directly so the
 * widget stays current in the background (driven by the 30-minute
 * updatePeriodMillis cycle).
 *
 * Snapshot JSON: {version, lastUpdated,
 *                 tasks:[{id, name, dueDate, priority, approval, assignedTo}],
 *                 projectTasks:[{id, name, projectId, assignedTo, completed}],
 *                 projects:[{id, name, color, icon}],
 *                 filterTasks:[{id, name, filterId, assignedTo, completed}],
 *                 filters:[{id, name, color, conditions, operator}],
 *                 members:[{id, name, image}]}
 * Config JSON:   {serverUrl, token, userId}
 * Options JSON:  {opacity, theme}  — device-wide widget appearance, kept across logout
 *
 * Since v2 the snapshot holds every member's tasks; widgets narrow it down to
 * the current user unless the per-widget "include others" option is on.
 */
public final class WidgetStore {
    private static final String TAG = "DonetickWidget";
    private static final String PREFS = "donetick_widget";
    private static final String KEY_DATA = "widget_tasks";
    private static final String KEY_CONFIG = "widget_config";
    private static final String KEY_OPTIONS = "widget_options";
    private static final String KEY_INCLUDE_OTHERS_PREFIX = "include_others_";
    private static final String KEY_OPACITY_PREFIX = "opacity_";
    private static final String KEY_THEME_PREFIX = "theme_";
    private static final String KEY_PROJECT_INDEX_PREFIX = "project_index_";
    private static final String KEY_PROJECT_PAGE_PREFIX = "project_page_";
    private static final String KEY_FILTER_INDEX_PREFIX = "filter_index_";
    private static final String KEY_FILTER_PAGE_PREFIX = "filter_page_";

    /** Per-widget opacity sentinel meaning "follow the app-wide setting". */
    public static final int OPACITY_INHERIT = -1;
    private static final int DEFAULT_OPACITY = 100;

    // Same filtering window as src/service/WidgetService.js
    private static final int WINDOW_DAYS = 7;
    private static final int MAX_TASKS = 100;
    // Don't hit the network if the app (or a previous refresh) updated the
    // snapshot recently; also guards against notify->refresh loops.
    private static final long STALE_MS = 10 * 60 * 1000;
    // Backoff for retrying a widget completion after a cold-start DNS race
    // (see openConnection). Index = dnsRetry attempt number.
    private static final long[] DNS_RETRY_BACKOFF_MS = {500, 1000, 2000};

    private static final Object REFRESH_LOCK = new Object();

    private WidgetStore() {}

    public static class Task {
        public String id;
        public String name;
        public Long dueDate; // epoch millis, null when unscheduled
        public int priority;
        public boolean approval;
        public String assignedTo; // member userId, null when unassigned
    }

    public static class Member {
        public String id;
        public String name;
        public String image; // avatar URL, may be null
    }

    public static class Project {
        public String id;
        public String name;
        public String color;
        public String icon;
    }

    public static class ProjectTask {
        public String id;
        public String name;
        public String projectId;
        public String assignedTo;
        public boolean completed;
        public Long dueDate;
        public int priority;
    }

    public static class Filter {
        public String id;
        public String name;
        public String color;
    }

    public static class FilterTask {
        public String id;
        public String name;
        public String filterId;
        public String assignedTo;
        public boolean completed;
        public Long dueDate;
        public int priority;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext()
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void saveData(Context context, String json) {
        prefs(context).edit().putString(KEY_DATA, json).apply();
    }

    public static void saveConfig(Context context, String json) {
        prefs(context).edit().putString(KEY_CONFIG, json).apply();
    }

    public static void saveOptions(Context context, String json) {
        prefs(context).edit().putString(KEY_OPTIONS, json).apply();
    }

    /**
     * Wipe the task snapshot and API credentials on logout. Appearance options
     * and per-widget placement settings survive: they describe widgets the user
     * put on their home screen, not the account that was signed in.
     */
    public static void clear(Context context) {
        prefs(context).edit().remove(KEY_DATA).remove(KEY_CONFIG).apply();
    }

    public static boolean hasConfig(Context context) {
        return prefs(context).getString(KEY_CONFIG, null) != null;
    }

    /** The signed-in user's id from the pushed config, or null. */
    public static String userId(Context context) {
        try {
            String raw = prefs(context).getString(KEY_CONFIG, null);
            if (raw == null) return null;
            Object id = new JSONObject(raw).opt("userId");
            return id == null ? null : String.valueOf(id);
        } catch (Exception e) {
            return null;
        }
    }

    /** Per-widget "include tasks assigned to others" option (default off). */
    public static boolean includeOthers(Context context, int appWidgetId) {
        return prefs(context).getBoolean(KEY_INCLUDE_OTHERS_PREFIX + appWidgetId, false);
    }

    public static void setIncludeOthers(Context context, int appWidgetId, boolean value) {
        prefs(context).edit()
                .putBoolean(KEY_INCLUDE_OTHERS_PREFIX + appWidgetId, value)
                .apply();
    }

    /**
     * App-wide widget background opacity in percent (0 = fully transparent,
     * 100 = solid), set from Settings → Widgets and pushed with the snapshot.
     */
    public static int globalOpacity(Context context) {
        try {
            String raw = prefs(context).getString(KEY_OPTIONS, null);
            if (raw == null) return DEFAULT_OPACITY;
            return clampOpacity(new JSONObject(raw).optInt("opacity", DEFAULT_OPACITY));
        } catch (Exception e) {
            return DEFAULT_OPACITY;
        }
    }

    /** Per-widget override, or {@link #OPACITY_INHERIT} when it follows the app setting. */
    public static int opacityOverride(Context context, int appWidgetId) {
        int stored = prefs(context).getInt(KEY_OPACITY_PREFIX + appWidgetId, OPACITY_INHERIT);
        return stored == OPACITY_INHERIT ? OPACITY_INHERIT : clampOpacity(stored);
    }

    public static void setOpacityOverride(Context context, int appWidgetId, int percent) {
        SharedPreferences.Editor editor = prefs(context).edit();
        if (percent == OPACITY_INHERIT) {
            editor.remove(KEY_OPACITY_PREFIX + appWidgetId);
        } else {
            editor.putInt(KEY_OPACITY_PREFIX + appWidgetId, clampOpacity(percent));
        }
        editor.apply();
    }

    /** The opacity a given widget instance should draw with. */
    public static int opacity(Context context, int appWidgetId) {
        int override = opacityOverride(context, appWidgetId);
        return override == OPACITY_INHERIT ? globalOpacity(context) : override;
    }

    /**
     * App-wide widget colour scheme, set from Settings → Widgets and pushed with
     * the snapshot. Defaults to {@link WidgetTheme#MODE_AUTO} (follow the phone).
     */
    public static int globalTheme(Context context) {
        try {
            String raw = prefs(context).getString(KEY_OPTIONS, null);
            if (raw == null) return WidgetTheme.MODE_AUTO;
            return parseTheme(new JSONObject(raw).optString("theme", "auto"));
        } catch (Exception e) {
            return WidgetTheme.MODE_AUTO;
        }
    }

    /** Per-widget override, or {@link WidgetTheme#MODE_INHERIT} when it follows the app setting. */
    public static int themeOverride(Context context, int appWidgetId) {
        return prefs(context).getInt(KEY_THEME_PREFIX + appWidgetId, WidgetTheme.MODE_INHERIT);
    }

    public static void setThemeOverride(Context context, int appWidgetId, int mode) {
        SharedPreferences.Editor editor = prefs(context).edit();
        if (mode == WidgetTheme.MODE_INHERIT) {
            editor.remove(KEY_THEME_PREFIX + appWidgetId);
        } else {
            editor.putInt(KEY_THEME_PREFIX + appWidgetId, mode);
        }
        editor.apply();
    }

    /** The colour scheme a given widget instance should draw with. */
    public static int theme(Context context, int appWidgetId) {
        int override = themeOverride(context, appWidgetId);
        return override == WidgetTheme.MODE_INHERIT ? globalTheme(context) : override;
    }

    private static int parseTheme(String value) {
        if ("light".equals(value)) return WidgetTheme.MODE_LIGHT;
        if ("dark".equals(value)) return WidgetTheme.MODE_DARK;
        return WidgetTheme.MODE_AUTO;
    }

    /** 0-100 percent as an 0-255 alpha channel. */
    public static int alphaOf(int percent) {
        return Math.round(clampOpacity(percent) * 255f / 100f);
    }

    private static int clampOpacity(int percent) {
        return Math.max(0, Math.min(100, percent));
    }

    public static void removeWidgetOptions(Context context, int appWidgetId) {
        prefs(context).edit()
                .remove(KEY_INCLUDE_OTHERS_PREFIX + appWidgetId)
                .remove(KEY_OPACITY_PREFIX + appWidgetId)
                .remove(KEY_THEME_PREFIX + appWidgetId)
                .remove(KEY_PROJECT_INDEX_PREFIX + appWidgetId)
                .remove(KEY_PROJECT_PAGE_PREFIX + appWidgetId)
                .remove(KEY_FILTER_INDEX_PREFIX + appWidgetId)
                .remove(KEY_FILTER_PAGE_PREFIX + appWidgetId)
                .apply();
    }

    public static int projectIndex(Context context, int widgetId) {
        return prefs(context).getInt(KEY_PROJECT_INDEX_PREFIX + widgetId, 0);
    }

    public static int projectPage(Context context, int widgetId) {
        return prefs(context).getInt(KEY_PROJECT_PAGE_PREFIX + widgetId, 0);
    }

    public static void setProjectPosition(Context context, int widgetId, int index, int page) {
        prefs(context).edit()
                .putInt(KEY_PROJECT_INDEX_PREFIX + widgetId, Math.max(0, index))
                .putInt(KEY_PROJECT_PAGE_PREFIX + widgetId, Math.max(0, page))
                .apply();
    }

    public static int filterIndex(Context context, int widgetId) {
        return prefs(context).getInt(KEY_FILTER_INDEX_PREFIX + widgetId, 0);
    }

    public static int filterPage(Context context, int widgetId) {
        return prefs(context).getInt(KEY_FILTER_PAGE_PREFIX + widgetId, 0);
    }

    public static void setFilterPosition(Context context, int widgetId, int index, int page) {
        prefs(context).edit()
                .putInt(KEY_FILTER_INDEX_PREFIX + widgetId, Math.max(0, index))
                .putInt(KEY_FILTER_PAGE_PREFIX + widgetId, Math.max(0, page))
                .apply();
    }

    public static long lastUpdated(Context context) {
        try {
            String raw = prefs(context).getString(KEY_DATA, null);
            if (raw == null) return 0;
            return new JSONObject(raw).optLong("lastUpdated", 0);
        } catch (Exception e) {
            return 0;
        }
    }

    public static List<Task> loadTasks(Context context) {
        List<Task> tasks = new ArrayList<>();
        try {
            String raw = prefs(context).getString(KEY_DATA, null);
            if (raw == null) return tasks;
            JSONArray arr = new JSONObject(raw).optJSONArray("tasks");
            if (arr == null) return tasks;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj == null) continue;
                Task task = new Task();
                task.id = String.valueOf(obj.opt("id"));
                task.name = obj.optString("name", "");
                task.dueDate = obj.isNull("dueDate") ? null : obj.optLong("dueDate");
                task.priority = obj.optInt("priority", 0);
                task.approval = obj.optBoolean("approval", false);
                // v1 snapshots carried only the user's own tasks and had no
                // assignedTo — treat those rows as "mine".
                task.assignedTo = obj.has("assignedTo")
                        ? (obj.isNull("assignedTo") ? null : String.valueOf(obj.opt("assignedTo")))
                        : userId(context);
                tasks.add(task);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse widget snapshot", e);
        }
        return tasks;
    }

    public static List<Project> loadProjects(Context context) {
        List<Project> projects = new ArrayList<>();
        try {
            String raw = prefs(context).getString(KEY_DATA, null);
            if (raw == null) return projects;
            JSONArray arr = new JSONObject(raw).optJSONArray("projects");
            if (arr == null) return projects;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj == null) continue;
                Project project = new Project();
                project.id = obj.optString("id", "default");
                project.name = obj.optString("name", "Project");
                project.color = obj.optString("color", "#64748B");
                project.icon = obj.isNull("icon") ? null : obj.optString("icon", null);
                projects.add(project);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse widget projects", e);
        }
        return projects;
    }

    public static List<Filter> loadFilters(Context context) {
        List<Filter> filters = new ArrayList<>();
        try {
            String raw = prefs(context).getString(KEY_DATA, null);
            if (raw == null) return filters;
            JSONArray arr = new JSONObject(raw).optJSONArray("filters");
            if (arr == null) return filters;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj == null || obj.opt("id") == null) continue;
                Filter filter = new Filter();
                filter.id = String.valueOf(obj.opt("id"));
                filter.name = obj.optString("name", "Filter");
                filter.color = obj.optString("color", "#64748B");
                filters.add(filter);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse widget filters", e);
        }
        return filters;
    }

    public static List<FilterTask> loadFilterTasks(Context context) {
        List<FilterTask> tasks = new ArrayList<>();
        try {
            String raw = prefs(context).getString(KEY_DATA, null);
            if (raw == null) return tasks;
            JSONArray arr = new JSONObject(raw).optJSONArray("filterTasks");
            if (arr == null) return tasks;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj == null || obj.opt("id") == null) continue;
                FilterTask task = new FilterTask();
                task.id = String.valueOf(obj.opt("id"));
                task.name = obj.optString("name", "");
                task.filterId = obj.optString("filterId", "");
                task.assignedTo = obj.isNull("assignedTo") ? null : obj.optString("assignedTo", null);
                task.completed = obj.optBoolean("completed", false);
                task.dueDate = obj.isNull("dueDate") ? null : obj.optLong("dueDate");
                task.priority = obj.optInt("priority", 0);
                tasks.add(task);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse filter widget tasks", e);
        }
        return tasks;
    }

    public static List<ProjectTask> loadProjectTasks(Context context) {
        List<ProjectTask> tasks = new ArrayList<>();
        try {
            String raw = prefs(context).getString(KEY_DATA, null);
            if (raw == null) return tasks;
            JSONArray arr = new JSONObject(raw).optJSONArray("projectTasks");
            if (arr == null) return tasks;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj == null || obj.opt("id") == null) continue;
                ProjectTask task = new ProjectTask();
                task.id = String.valueOf(obj.opt("id"));
                task.name = obj.optString("name", "");
                task.projectId = obj.optString("projectId", "default");
                task.assignedTo = obj.isNull("assignedTo") ? null : obj.optString("assignedTo", null);
                task.completed = obj.optBoolean("completed", false);
                task.dueDate = obj.isNull("dueDate") ? null : obj.optLong("dueDate");
                task.priority = obj.optInt("priority", 0);
                tasks.add(task);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse project widget tasks", e);
        }
        return tasks;
    }

    public static List<Member> loadMembers(Context context) {
        List<Member> members = new ArrayList<>();
        try {
            String raw = prefs(context).getString(KEY_DATA, null);
            if (raw == null) return members;
            JSONArray arr = new JSONObject(raw).optJSONArray("members");
            if (arr == null) return members;
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.optJSONObject(i);
                if (obj == null) continue;
                Member member = new Member();
                member.id = String.valueOf(obj.opt("id"));
                member.name = obj.optString("name", "");
                member.image = obj.isNull("image") ? null : obj.optString("image", null);
                members.add(member);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse widget members", e);
        }
        return members;
    }

    /**
     * Tasks a today/week widget should render: everything when includeOthers,
     * otherwise the user's own tasks plus approvals (which wait on them).
     */
    public static List<Task> visibleTasks(Context context, List<Task> tasks, boolean includeOthers) {
        if (includeOthers) return tasks;
        String me = userId(context);
        List<Task> mine = new ArrayList<>();
        for (Task task : tasks) {
            if (task.approval || (me != null && me.equals(task.assignedTo))) {
                mine.add(task);
            }
        }
        return mine;
    }

    /** Tasks the Today widget shows: awaiting approval, overdue, or due today. */
    public static List<Task> todaySubset(List<Task> tasks) {
        long endOfToday = endOfDay(0);
        List<Task> subset = new ArrayList<>();
        for (Task task : tasks) {
            if (task.approval || (task.dueDate != null && task.dueDate <= endOfToday)) {
                subset.add(task);
            }
        }
        return subset;
    }

    public static long endOfDay(int daysFromNow) {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, daysFromNow);
        cal.set(Calendar.HOUR_OF_DAY, 23);
        cal.set(Calendar.MINUTE, 59);
        cal.set(Calendar.SECOND, 59);
        cal.set(Calendar.MILLISECOND, 999);
        return cal.getTimeInMillis();
    }

    /**
     * Fetch /chores/ from the configured server and rebuild the snapshot.
     * Returns true when a network refresh actually happened and succeeded.
     * Safe to call from RemoteViewsFactory.onDataSetChanged (binder thread).
     */
    public static boolean refreshFromServerIfStale(Context context) {
        return refreshFromServer(context, false);
    }

    public static boolean refreshFromServer(Context context, boolean force) {
        synchronized (REFRESH_LOCK) {
            long age = System.currentTimeMillis() - lastUpdated(context);
            if (!force && age < STALE_MS) return false;

            String rawConfig = prefs(context).getString(KEY_CONFIG, null);
            if (rawConfig == null) return false;

            HttpURLConnection connection = null;
            try {
                JSONObject config = new JSONObject(rawConfig);
                String serverUrl = config.optString("serverUrl", "");
                String token = config.optString("token", "");
                if (serverUrl.isEmpty() || token.isEmpty()) return false;

                URL url = new URL(serverUrl + "/chores/");
                connection = openConnection(context, url);
                // Widget broadcasts must finish within roughly ten seconds.
                // Keep the combined network budget below that limit.
                connection.setConnectTimeout(3000);
                connection.setReadTimeout(5000);
                connection.setRequestProperty("Authorization", "Bearer " + token);
                connection.setRequestProperty("Accept", "application/json");

                if (connection.getResponseCode() != 200) {
                    // Expired token or server trouble — keep the last snapshot,
                    // the UI surfaces staleness via the "Updated …" line.
                    Log.w(TAG, "Widget refresh got HTTP " + connection.getResponseCode());
                    return false;
                }

                JSONArray chores = new JSONObject(readAll(connection.getInputStream()))
                        .optJSONArray("res");
                if (chores == null) return false;

                // The chores endpoint has no member profiles, so carry the
                // member list over from the previous snapshot (it changes
                // rarely and the app re-pushes it on every open).
                JSONArray members = null;
                JSONArray projects = null;
                JSONArray filters = null;
                String previous = prefs(context).getString(KEY_DATA, null);
                if (previous != null) {
                    JSONObject old = new JSONObject(previous);
                    members = old.optJSONArray("members");
                    projects = old.optJSONArray("projects");
                    filters = old.optJSONArray("filters");
                }

                JSONObject snapshot = new JSONObject();
                snapshot.put("version", 4);
                snapshot.put("lastUpdated", System.currentTimeMillis());
                snapshot.put("tasks", filterChores(chores));
                snapshot.put("projectTasks", projectTasks(chores));
                snapshot.put("projects", projects == null ? new JSONArray() : projects);
                snapshot.put("filterTasks", filterWidgetTasks(chores,
                        filters == null ? new JSONArray() : filters, userId(context)));
                snapshot.put("filters", filters == null ? new JSONArray() : filters);
                snapshot.put("members", members == null ? new JSONArray() : members);
                saveData(context, snapshot.toString());
                return true;
            } catch (Exception e) {
                Log.w(TAG, "Widget background refresh failed", e);
                return false;
            } finally {
                if (connection != null) connection.disconnect();
            }
        }
    }

    /** Update the local snapshot first so a widget tap has immediate feedback. */
    public static void setProjectTaskCompleted(Context context, String taskId, boolean completed) {
        try {
            String data = prefs(context).getString(KEY_DATA, null);
            if (data == null) return;
            JSONObject snapshot = new JSONObject(data);
            JSONArray projectTasks = snapshot.optJSONArray("projectTasks");
            setCompleted(projectTasks, taskId, completed);
            JSONArray filterTasks = snapshot.optJSONArray("filterTasks");
            setCompleted(filterTasks, taskId, completed);
            saveData(context, snapshot.toString());
        } catch (Exception e) {
            Log.w(TAG, "Failed to update project task optimistically", e);
        }
    }

    private static void setCompleted(JSONArray tasks, String taskId, boolean completed)
            throws Exception {
        if (tasks == null) return;
        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task != null && taskId.equals(String.valueOf(task.opt("id")))) {
                task.put("completed", completed);
            }
        }
    }

    public static boolean completeTask(Context context, String taskId) {
        return completeTask(context, taskId, 0);
    }

    private static boolean completeTask(Context context, String taskId, int dnsRetry) {
        HttpURLConnection connection = null;
        try {
            String raw = prefs(context).getString(KEY_CONFIG, null);
            if (raw == null) return false;
            JSONObject config = new JSONObject(raw);
            URL url = new URL(config.optString("serverUrl") + "/chores/" + taskId + "/do");
            Log.i(TAG, "Sending widget completion for task " + taskId + " to " + url);
            connection = openConnection(context, url);
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            // ProjectWidgetProvider uses goAsync(), whose PendingResult still
            // has a short system deadline. Never let this request trigger a
            // BroadcastReceiver ANR when a self-hosted server is unreachable.
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(5000);
            connection.setRequestProperty("Authorization", "Bearer " + config.optString("token"));
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            byte[] body = "null".getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(body.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body);
                output.flush();
            }
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                Log.w(TAG, "Widget completion got HTTP " + status + " for task " + taskId);
                return false;
            }

            Log.i(TAG, "Widget completion succeeded for task " + taskId
                    + " with HTTP " + status);
            setProjectTaskCompleted(context, taskId, true);
            return true;
        } catch (UnknownHostException e) {
            if (dnsRetry < DNS_RETRY_BACKOFF_MS.length) {
                long backoff = DNS_RETRY_BACKOFF_MS[dnsRetry];
                Log.w(TAG, "DNS was not ready for widget completion; retrying task " + taskId
                        + " in " + backoff + "ms (attempt " + (dnsRetry + 1) + ")");
                try {
                    Thread.sleep(backoff);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    return false;
                }
                return completeTask(context, taskId, dnsRetry + 1);
            }
            Log.e(TAG, "Widget completion failed for task " + taskId + ": UnknownHostException: "
                    + e.getMessage(), e);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Widget completion failed for task " + taskId + ": "
                    + e.getClass().getSimpleName() + ": " + e.getMessage(), e);
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static JSONArray filterWidgetTasks(JSONArray chores, JSONArray filters,
                                                 String userId) throws Exception {
        JSONArray result = new JSONArray();
        for (int f = 0; f < filters.length(); f++) {
            JSONObject filter = filters.optJSONObject(f);
            if (filter == null || filter.opt("id") == null) continue;
            String filterId = String.valueOf(filter.opt("id"));
            int added = 0;
            for (int i = 0; i < chores.length() && added < 100; i++) {
                JSONObject chore = chores.optJSONObject(i);
                if (chore == null || chore.opt("id") == null
                        || !matchesFilter(chore, filter, userId)) continue;
                JSONObject task = new JSONObject();
                task.put("id", chore.opt("id"));
                task.put("name", chore.optString("name", ""));
                task.put("filterId", filterId);
                task.put("assignedTo", chore.isNull("assignedTo")
                        ? JSONObject.NULL : String.valueOf(chore.opt("assignedTo")));
                task.put("completed", false);
                Long dueDate = parseDate(chore.optString("nextDueDate", null));
                task.put("dueDate", dueDate == null ? JSONObject.NULL : dueDate);
                task.put("priority", chore.optInt("priority", 0));
                result.put(task);
                added++;
            }
        }
        return result;
    }

    private static boolean matchesFilter(JSONObject chore, JSONObject filter, String userId) {
        JSONArray conditions = filter.optJSONArray("conditions");
        if (conditions == null || conditions.length() == 0) return true;
        boolean useOr = "OR".equalsIgnoreCase(filter.optString("operator", "AND"));
        for (int i = 0; i < conditions.length(); i++) {
            JSONObject condition = conditions.optJSONObject(i);
            boolean matches = condition == null || matchesCondition(chore, condition, userId);
            if (useOr && matches) return true;
            if (!useOr && !matches) return false;
        }
        return !useOr;
    }

    private static boolean matchesCondition(JSONObject chore, JSONObject condition, String userId) {
        String type = condition.optString("type", "");
        String operator = condition.optString("operator", "");
        Object value = condition.opt("value");
        boolean positive;
        switch (type) {
            case "assignee":
                positive = valueMatches(value, entry -> assigneeMatches(chore, entry, userId));
                return "is".equals(operator) ? positive : !positive;
            case "createdBy":
                positive = valueMatches(value, entry -> {
                    String expected = "me".equals(String.valueOf(entry)) ? userId : String.valueOf(entry);
                    return expected != null && expected.equals(String.valueOf(chore.opt("createdBy")));
                });
                return "is".equals(operator) ? positive : !positive;
            case "priority":
                return compareNumber(chore.optInt("priority", 0), operator, value);
            case "status":
                positive = valueMatches(value, entry -> numbersEqual(chore.optInt("status", 0), entry));
                return "is".equals(operator) ? positive : !positive;
            case "dueDate":
                return matchesDueDate(chore.optString("nextDueDate", null), operator, value);
            case "label":
                JSONArray labels = chore.optJSONArray("labelsV2");
                positive = valueMatches(value, entry -> arrayContainsId(labels, entry, "id"));
                return ("has".equals(operator) || "is".equals(operator)) ? positive : !positive;
            case "project":
                String projectId = chore.isNull("projectId")
                        ? chore.optString("project_id", "default")
                        : chore.optString("projectId", "default");
                if (projectId.isEmpty()) projectId = "default";
                final String actualProjectId = projectId;
                positive = valueMatches(value,
                        entry -> actualProjectId.equals(String.valueOf(entry)));
                return "is".equals(operator) ? positive : !positive;
            case "points":
                return compareNumber(chore.optDouble("points", 0), operator, value);
            default:
                return true;
        }
    }

    private interface ValueMatcher { boolean matches(Object value); }

    private static boolean valueMatches(Object value, ValueMatcher matcher) {
        if (value instanceof JSONArray) {
            JSONArray values = (JSONArray) value;
            for (int i = 0; i < values.length(); i++) if (matcher.matches(values.opt(i))) return true;
            return false;
        }
        return matcher.matches(value);
    }

    private static boolean assigneeMatches(JSONObject chore, Object entry, String userId) {
        String value = String.valueOf(entry);
        String assigned = chore.isNull("assignedTo") ? null : String.valueOf(chore.opt("assignedTo"));
        JSONArray assignees = chore.optJSONArray("assignees");
        if ("anyone".equals(value)) return true;
        if ("me".equals(value)) value = userId;
        if ("available_for_me".equals(value)) return userId != null
                && (assigned == null || userId.equals(assigned));
        if ("others".equals(value)) return userId != null && !userId.equals(assigned)
                && !arrayContainsId(assignees, userId, "userId");
        return value != null && (value.equals(assigned)
                || arrayContainsId(assignees, value, "userId"));
    }

    private static boolean arrayContainsId(JSONArray array, Object value, String key) {
        if (array == null) return false;
        String expected = String.valueOf(value);
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.optJSONObject(i);
            if (item != null && expected.equals(String.valueOf(item.opt(key)))) return true;
        }
        return false;
    }

    private static boolean numbersEqual(double number, Object value) {
        try { return number == Double.parseDouble(String.valueOf(value)); }
        catch (Exception ignored) { return false; }
    }

    private static boolean compareNumber(double number, String operator, Object value) {
        if ("is".equals(operator) || "isNot".equals(operator)) {
            boolean equal = valueMatches(value, entry -> numbersEqual(number, entry));
            return "is".equals(operator) ? equal : !equal;
        }
        double target;
        try { target = Double.parseDouble(String.valueOf(value)); }
        catch (Exception ignored) { return false; }
        if ("equals".equals(operator)) return number == target;
        if ("greaterThan".equals(operator)) return number > target;
        if ("lessThan".equals(operator)) return number < target;
        if ("greaterThanOrEqual".equals(operator)) return number >= target;
        if ("lessThanOrEqual".equals(operator)) return number <= target;
        return false;
    }

    private static boolean matchesDueDate(String rawDate, String operator, Object value) {
        if ("anyOf".equals(operator) && value instanceof JSONArray) {
            JSONArray values = (JSONArray) value;
            for (int i = 0; i < values.length(); i++) {
                if (matchesDueDate(rawDate, values.optString(i), null)) return true;
            }
            return false;
        }
        Long due = parseDate(rawDate);
        if ("hasNoDueDate".equals(operator)) return due == null;
        if ("hasDueDate".equals(operator)) return due != null;
        if (due == null) return false;
        long now = System.currentTimeMillis();
        Calendar today = Calendar.getInstance();
        today.set(Calendar.HOUR_OF_DAY, 0); today.set(Calendar.MINUTE, 0);
        today.set(Calendar.SECOND, 0); today.set(Calendar.MILLISECOND, 0);
        long start = today.getTimeInMillis();
        if ("isOverdue".equals(operator)) return due < now;
        if ("isDueToday".equals(operator)) return due >= start && due < start + 86400000L;
        if ("isDueTomorrow".equals(operator)) return due >= start + 86400000L && due < start + 172800000L;
        if ("isDueThisWeek".equals(operator)) return due >= start && due < start + 7 * 86400000L;
        Calendar dueCalendar = Calendar.getInstance(); dueCalendar.setTimeInMillis(due);
        if ("isDueThisMonth".equals(operator)) return dueCalendar.get(Calendar.YEAR) == today.get(Calendar.YEAR)
                && dueCalendar.get(Calendar.MONTH) == today.get(Calendar.MONTH);
        if ("between".equals(operator) && value instanceof JSONArray) {
            JSONArray range = (JSONArray) value;
            Long from = parseDate(range.optString(0, null));
            Long to = parseDate(range.optString(1, null));
            return from != null && to != null && due >= from && due <= to;
        }
        String targetRaw = String.valueOf(value);
        Long target = "today".equals(targetRaw) ? start : parseDate(targetRaw);
        if (target == null) return false;
        if ("before".equals(operator)) return due < target;
        if ("after".equals(operator)) return due > target;
        return false;
    }

    private static JSONArray projectTasks(JSONArray chores) throws Exception {
        JSONArray result = new JSONArray();
        for (int i = 0; i < chores.length() && result.length() < 500; i++) {
            JSONObject chore = chores.optJSONObject(i);
            if (chore == null || chore.opt("id") == null) continue;
            JSONObject task = new JSONObject();
            task.put("id", chore.opt("id"));
            task.put("name", chore.optString("name", ""));
            String projectId = chore.optString("projectId", chore.optString("project_id", "default"));
            task.put("projectId", projectId.isEmpty() ? "default" : projectId);
            task.put("assignedTo", chore.isNull("assignedTo") ? JSONObject.NULL : String.valueOf(chore.opt("assignedTo")));
            task.put("completed", false);
            Long dueDate = parseDate(chore.optString("nextDueDate", null));
            task.put("dueDate", dueDate == null ? JSONObject.NULL : dueDate);
            task.put("priority", chore.optInt("priority", 0));
            result.put(task);
        }
        return result;
    }

    /** Mirror of buildWidgetTasks in src/service/WidgetService.js. */
    private static JSONArray filterChores(JSONArray chores) throws Exception {
        long cutoff = endOfDay(WINDOW_DAYS);
        List<JSONObject> selected = new ArrayList<>();

        for (int i = 0; i < chores.length(); i++) {
            JSONObject chore = chores.optJSONObject(i);
            if (chore == null || chore.opt("id") == null) continue;

            boolean approval = chore.optInt("status", 0) == 3;
            Long dueDate = parseDate(chore.optString("nextDueDate", null));
            boolean inWindow = dueDate != null && dueDate <= cutoff;
            if (!approval && !inWindow) continue;

            JSONObject task = new JSONObject();
            task.put("id", chore.opt("id"));
            task.put("name", chore.optString("name", ""));
            task.put("dueDate", dueDate == null ? JSONObject.NULL : dueDate);
            task.put("priority", chore.optInt("priority", 0));
            task.put("approval", approval);
            task.put("assignedTo", chore.isNull("assignedTo")
                    ? JSONObject.NULL
                    : String.valueOf(chore.opt("assignedTo")));
            selected.add(task);
        }

        Collections.sort(selected, (a, b) -> {
            boolean aApproval = a.optBoolean("approval");
            boolean bApproval = b.optBoolean("approval");
            if (aApproval != bApproval) return aApproval ? -1 : 1;
            long aDue = a.isNull("dueDate") ? Long.MAX_VALUE : a.optLong("dueDate");
            long bDue = b.isNull("dueDate") ? Long.MAX_VALUE : b.optLong("dueDate");
            int dueComparison = Long.compare(aDue, bDue);
            if (dueComparison != 0) return dueComparison;
            return Integer.compare(priorityRank(a.optInt("priority", 0)),
                    priorityRank(b.optInt("priority", 0)));
        });

        JSONArray result = new JSONArray();
        for (int i = 0; i < selected.size() && i < MAX_TASKS; i++) {
            result.put(selected.get(i));
        }
        return result;
    }

    static int priorityRank(int priority) {
        if (priority >= 1 && priority <= 4) return priority - 1;
        return 4;
    }

    /**
     * Bind widget traffic to Android's active network. A widget tap can cold
     * start the app process before its default network's DNS is usable, which
     * otherwise produces a transient UnknownHostException even while Wi-Fi is
     * validated and the hostname resolves system-wide.
     *
     * onAvailable() alone is not enough: it fires on link-up, before
     * LinkProperties (and therefore the network's DNS servers) are attached,
     * so a connection opened right then can still fail to resolve. Wait for
     * onLinkPropertiesChanged() to report a non-empty DNS server list instead.
     */
    private static HttpURLConnection openConnection(Context context, URL url) throws Exception {
        ConnectivityManager manager = (ConnectivityManager) context
                .getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) {
            return (HttpURLConnection) url.openConnection();
        }

        AtomicReference<Network> dnsReadyNetwork = new AtomicReference<>();
        AtomicReference<Network> availableNetwork = new AtomicReference<>();
        CountDownLatch dnsReady = new CountDownLatch(1);
        ConnectivityManager.NetworkCallback callback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                availableNetwork.compareAndSet(null, network);
            }

            @Override
            public void onLinkPropertiesChanged(Network network, LinkProperties linkProperties) {
                if (!linkProperties.getDnsServers().isEmpty()
                        && dnsReadyNetwork.compareAndSet(null, network)) {
                    dnsReady.countDown();
                }
            }
        };
        try {
            manager.registerDefaultNetworkCallback(callback);
            dnsReady.await(500, TimeUnit.MILLISECONDS);
        } finally {
            try {
                manager.unregisterNetworkCallback(callback);
            } catch (RuntimeException ignored) {
                // The callback may not have finished registering.
            }
        }

        Network network = dnsReadyNetwork.get();
        if (network == null) network = availableNetwork.get();
        if (network == null) network = manager.getActiveNetwork();
        return (HttpURLConnection) (network != null
                ? network.openConnection(url)
                : url.openConnection());
    }

    private static Long parseDate(String value) {
        if (value == null || value.isEmpty() || "null".equals(value)) return null;
        try {
            return OffsetDateTime.parse(value).toInstant().toEpochMilli();
        } catch (Exception ignored) {
            try {
                return LocalDate.parse(value).atStartOfDay(ZoneId.systemDefault())
                        .toInstant().toEpochMilli();
            } catch (Exception e) {
                return null;
            }
        }
    }

    private static String readAll(InputStream stream) throws Exception {
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }
}
