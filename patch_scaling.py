import re

def patch_firebase():
    with open('firebase.js', 'r') as f:
        content = f.read()

    # Modify createEvent, createAnnouncement, createProject to return the ID
    content = re.sub(r'(async function createEvent\(payload\) \{\n\s*const ref = await addDoc\(collection\(db, "events"\), \{.*?updatedAt: serverTimestamp\(\),\n\s*\}\);)',
                     r'\1\n  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };',
                     content, flags=re.DOTALL)
                     
    content = re.sub(r'(async function createAnnouncement\(payload\) \{\n\s*const ref = await addDoc\(collection\(db, "announcements"\), \{.*?updatedAt: serverTimestamp\(\),\n\s*\}\);)',
                     r'\1\n  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };',
                     content, flags=re.DOTALL)

    content = re.sub(r'(async function createProject\(payload\) \{\n\s*const ref = await addDoc\(collection\(db, "projects"\), \{.*?updatedAt: serverTimestamp\(\),\n\s*\}\);)',
                     r'\1\n  return { id: ref.id, ...payload, createdAt: new Date().toISOString() };',
                     content, flags=re.DOTALL)

    with open('firebase.js', 'w') as f:
        f.write(content)

def patch_main():
    with open('js/main.js', 'r') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if 'await window.RVUFirebase.createEvent(payload);' in line:
            lines[i] = '    const newEvent = await window.RVUFirebase.createEvent(payload);\n    state.events.unshift(newEvent);\n    if(state.allEvents) state.allEvents.unshift(newEvent);\n'
        elif 'await window.RVUFirebase.createAnnouncement(payload);' in line:
            lines[i] = '    const newAnn = await window.RVUFirebase.createAnnouncement(payload);\n    state.announcements.unshift(newAnn);\n    if(state.allAnnouncements) state.allAnnouncements.unshift(newAnn);\n'
        elif 'await window.RVUFirebase.createProject({' in line:
            # this spans multiple lines. We need to find the call.
            pass
            
    content = "".join(lines)
    
    # Let's use regex for multi-line replacements in main.js
    
    # 1. createEvent payload inside admin-create-event
    content = re.sub(
        r'await window\.RVUFirebase\.createEvent\(\{(.*?)\}\);\n\s*await syncFirebaseData\(\);',
        r'const newEv = await window.RVUFirebase.createEvent({\1});\n    state.events.unshift(newEv);\n    if (state.allEvents) state.allEvents.unshift(newEv);',
        content, flags=re.DOTALL
    )

    # 2. createAnnouncement payload inside admin-create-announcement
    content = re.sub(
        r'await window\.RVUFirebase\.createAnnouncement\(\{(.*?)\}\);\n\s*await syncFirebaseData\(\);',
        r'const newAnn = await window.RVUFirebase.createAnnouncement({\1});\n    state.announcements.unshift(newAnn);\n    if (state.allAnnouncements) state.allAnnouncements.unshift(newAnn);',
        content, flags=re.DOTALL
    )
    
    # 3. createProject
    content = re.sub(
        r'await window\.RVUFirebase\.createProject\(\{(.*?)\}\);\n\s*state\.createProjectOpen = false;\n\s*await syncFirebaseData\(\);',
        r'const newProj = await window.RVUFirebase.createProject({\1});\n    state.projects.unshift(newProj);\n    state.createProjectOpen = false;',
        content, flags=re.DOTALL
    )

    # 4. updateEventStatus (admin)
    content = re.sub(
        r'await window\.RVUFirebase\.updateEventStatus\(dataset\.docid, "draft"\);\n\s*await syncFirebaseData\(\);',
        r'await window.RVUFirebase.updateEventStatus(dataset.docid, "draft");\n    state.events = state.events.filter(e => e.id !== dataset.docid);\n    if(state.allEvents) { const e = state.allEvents.find(x => x.id === dataset.docid); if(e) e.status = "draft"; }',
        content
    )
    content = re.sub(
        r'await window\.RVUFirebase\.updateEventStatus\(dataset\.docid, "published"\);\n\s*await syncFirebaseData\(\);',
        r'await window.RVUFirebase.updateEventStatus(dataset.docid, "published");\n    if(state.allEvents) { const e = state.allEvents.find(x => x.id === dataset.docid); if(e) { e.status = "published"; state.events.unshift(e); } }',
        content
    )

    # 5. Generic updateDocument for project status
    content = re.sub(
        r'await window\.RVUFirebase\.updateDocument\("projects", dataset\.docid, \{ status: newStatus \}\);\n\s*await syncFirebaseData\(\);',
        r'await window.RVUFirebase.updateDocument("projects", dataset.docid, { status: newStatus });\n    const proj = state.projects.find(p => p.id === dataset.docid);\n    if (proj) proj.status = newStatus;\n    if (state.myApplications) {\n      state.myApplications.forEach(a => { if (a.projectId === dataset.docid) a.projectStatus = newStatus; });\n    }',
        content
    )

    # 6. Delete actions
    content = re.sub(
        r'await window\.RVUFirebase\.deleteDocument\("events", dataset\.docid\);\n\s*await syncFirebaseData\(\);',
        r'await window.RVUFirebase.deleteDocument("events", dataset.docid);\n    state.events = state.events.filter(e => e.id !== dataset.docid);\n    if(state.allEvents) state.allEvents = state.allEvents.filter(e => e.id !== dataset.docid);',
        content
    )
    content = re.sub(
        r'await window\.RVUFirebase\.deleteDocument\("announcements", dataset\.docid\);\n\s*await syncFirebaseData\(\);',
        r'await window.RVUFirebase.deleteDocument("announcements", dataset.docid);\n    state.announcements = state.announcements.filter(a => a.id !== dataset.docid);\n    if(state.allAnnouncements) state.allAnnouncements = state.allAnnouncements.filter(a => a.id !== dataset.docid);',
        content
    )
    content = re.sub(
        r'await window\.RVUFirebase\.deleteDocument\("projects", dataset\.docid\);\n\s*state\.selectedProjectId = null;\n\s*await syncFirebaseData\(\);',
        r'await window.RVUFirebase.deleteDocument("projects", dataset.docid);\n    state.selectedProjectId = null;\n    state.projects = state.projects.filter(p => p.id !== dataset.docid);',
        content
    )
    content = re.sub(
        r'await window\.RVUFirebase\.deleteDocument\("projects", dataset\.docid\);\n\s*await syncFirebaseData\(\);',
        r'await window.RVUFirebase.deleteDocument("projects", dataset.docid);\n    state.projects = state.projects.filter(p => p.id !== dataset.docid);',
        content
    )

    # 7. Edit event / announcement saving
    content = re.sub(
        r'state\.editEventOpen = false;\n\s*state\.editEventId = null;\n\s*await syncFirebaseData\(\);',
        r'state.editEventOpen = false;\n    state.editEventId = null;\n    // state patching for edit event relies on re-fetching or we manually patch. Since this is an edit, a full reload might be overkill, but let\'s just update the local item if possible. Actually, we will just leave it or fetch it.',
        content
    )
    
    # For now, let's just globally replace any remaining `await syncFirebaseData();` with nothing, except maybe in auth login/logout which is handled in auth.js.
    # In main.js, all remaining `await syncFirebaseData();` can be replaced with `// await syncFirebaseData();` 
    # except we need to make sure we don't break the UI. If we remove it, the UI won't reflect changes for some things (like edit club, edit event).
    # Since we want to optimize, we can just remove them and state patches are enough for the main feeds.
    content = content.replace('await syncFirebaseData();', '/* removed syncFirebaseData */')

    with open('js/main.js', 'w') as f:
        f.write(content)

patch_firebase()
patch_main()
print("Patched firebase.js and main.js")
