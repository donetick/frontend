package com.donetick.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;

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
 *                 members:[{id, name, image}]}
 * Config JSON:   {serverUrl, token, userId}
 *
 * Since v2 the snapshot holds every member's tasks; widgets narrow it down to
 * the current user unless the per-widget "include others" option is on.
 */
public final class WidgetStore {
    private static final String TAG = "DonetickWidget";
    private static final String PREFS = "donetick_widget";
    private static final String KEY_DATA = "widget_tasks";
    private static final String KEY_CONFIG = "widget_config";
    private static final String KEY_INCLUDE_OTHERS_PREFIX = "include_others_";

    // Same filtering window as src/service/WidgetService.js
    private static final int WINDOW_DAYS = 7;
    private static final int MAX_TASKS = 100;
    // Don't hit the network if the app (or a previous refresh) updated the
    // snapshot recently; also guards against notify->refresh loops.
    private static final long STALE_MS = 10 * 60 * 1000;

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

    public static void clear(Context context) {
        prefs(context).edit().clear().apply();
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

    public static void removeWidgetOptions(Context context, int appWidgetId) {
        prefs(context).edit()
                .remove(KEY_INCLUDE_OTHERS_PREFIX + appWidgetId)
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
        synchronized (REFRESH_LOCK) {
            long age = System.currentTimeMillis() - lastUpdated(context);
            if (age < STALE_MS) return false;

            String rawConfig = prefs(context).getString(KEY_CONFIG, null);
            if (rawConfig == null) return false;

            HttpURLConnection connection = null;
            try {
                JSONObject config = new JSONObject(rawConfig);
                String serverUrl = config.optString("serverUrl", "");
                String token = config.optString("token", "");
                if (serverUrl.isEmpty() || token.isEmpty()) return false;

                URL url = new URL(serverUrl + "/chores/");
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(15000);
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
                String previous = prefs(context).getString(KEY_DATA, null);
                if (previous != null) {
                    members = new JSONObject(previous).optJSONArray("members");
                }

                JSONObject snapshot = new JSONObject();
                snapshot.put("version", 2);
                snapshot.put("lastUpdated", System.currentTimeMillis());
                snapshot.put("tasks", filterChores(chores));
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
            return Long.compare(aDue, bDue);
        });

        JSONArray result = new JSONArray();
        for (int i = 0; i < selected.size() && i < MAX_TASKS; i++) {
            result.put(selected.get(i));
        }
        return result;
    }

    private static Long parseDate(String value) {
        if (value == null || value.isEmpty() || "null".equals(value)) return null;
        try {
            return OffsetDateTime.parse(value).toInstant().toEpochMilli();
        } catch (Exception e) {
            return null;
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
