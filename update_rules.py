import re

with open("firestore.rules", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "function isSuperAdmin()" in line:
        new_lines.append("""    function isNotSuspended() {
      return !exists(/databases/$(database)/documents/users/$(request.auth.uid))
        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.suspended != true;
    }

""")
    new_lines.append(line)

content = "".join(new_lines)

# Now we find "allow create" or "allow update" rules that check isRvuEmail or isApprovedClubCore
# But only for user actions. Super admins bypass suspension check.

content = re.sub(
    r"(allow create, update, delete: if isRvuEmail\(\))",
    r"\1 && isNotSuspended()",
    content
)

content = re.sub(
    r"(allow create: if isRvuEmail\(\))",
    r"\1 && isNotSuspended()",
    content
)

content = re.sub(
    r"(allow update: if isRvuEmail\(\))",
    r"\1 && isNotSuspended()",
    content
)

content = re.sub(
    r"(allow update: if isApprovedClubCore\(clubId\))",
    r"\1 && isNotSuspended()",
    content
)

content = re.sub(
    r"(allow create: if isApprovedClubCore\(clubId\))",
    r"\1 && isNotSuspended()",
    content
)

content = re.sub(
    r"(allow update: if isClubPresident\(clubId\))",
    r"\1 && isNotSuspended()",
    content
)

with open("firestore.rules", "w") as f:
    f.write(content)

print("Rules updated.")
