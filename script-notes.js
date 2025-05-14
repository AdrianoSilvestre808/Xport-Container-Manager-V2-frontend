document.addEventListener("DOMContentLoaded", () => {
  fetchNotes();

  document.getElementById("addNoteBtn").addEventListener("click", () => {
    openNoteModal();
  });

  document.getElementById("note-form").addEventListener("submit", async e => {
    e.preventDefault();

    const id = document.getElementById("noteId").value;
    const title = document.getElementById("noteTitle").value;
    const content = document.getElementById("noteContent").value;

    const method = id ? "PUT" : "POST";
    const endpoint = id ? `/notes/${id}` : "/notes";

    await fetch(`http://198.245.53.14:5000${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });

    closeNoteModal();
    fetchNotes();
  });

  document.getElementById("deleteNoteBtn").addEventListener("click", async () => {
    const id = document.getElementById("noteId").value;
    if (!id) return;

    const confirmed = confirm("Are you sure you want to delete this note?");
    if (!confirmed) return;

    await fetch(`http://198.245.53.14:5000/notes/${id}`, {
      method: "DELETE",
    });

    closeNoteModal();
    fetchNotes();
  });
});

function fetchNotes() {
  fetch("http://198.245.53.14:5000/notes")
    .then(res => res.json())
    .then(notes => {
      const list = document.getElementById("note-list");
      list.innerHTML = "";

      notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "note-card";
        // Truncate content for preview
        const previewContent = note.content.length > 100 
          ? note.content.substring(0, 100) + '...' 
          : note.content;
        card.innerHTML = `
          <h3>${note.title}</h3>
          <p>${previewContent}</p>
        `;
        card.onclick = () => openNoteModal(note);
        list.appendChild(card);
      });
    });
}

function openNoteModal(note = {}) {
  document.getElementById("modal-title").textContent = note.id ? "Edit Note" : "New Note";
  document.getElementById("noteId").value = note.id || "";
  document.getElementById("noteTitle").value = note.title || "";
  document.getElementById("noteContent").value = note.content || "";

  document.getElementById("deleteNoteBtn").style.display = note.id ? "inline-block" : "none";
  document.getElementById("note-modal").classList.remove("hidden");
}

function closeNoteModal() {
  document.getElementById("note-modal").classList.add("hidden");
}
