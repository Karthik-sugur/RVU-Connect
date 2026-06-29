with open('js/render-admin.js', 'r') as f:
    lines = f.readlines()

# Find the index of "export function renderEventCard"
start_idx = -1
for i, line in enumerate(lines):
    if "export function renderEventCard" in line:
        start_idx = i
        break

if start_idx != -1:
    admin_lines = lines[:start_idx]
    ui_lines_to_append = lines[start_idx:]

    with open('js/render-admin.js', 'w') as f:
        f.writelines(admin_lines)

    with open('js/ui.js', 'a') as f:
        f.write("\n")
        f.writelines(ui_lines_to_append)
    print(f"Moved {len(ui_lines_to_append)} lines from render-admin.js to ui.js")
else:
    print("Could not find renderEventCard")
