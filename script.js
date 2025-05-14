// Global function for closing add modal
function closeAddModal() {
  const addModal = document.getElementById("add-modal");
  const form = document.getElementById("add-container-form");
  if (addModal) addModal.classList.add("hidden");
  if (form) form.reset();
}

document.addEventListener("DOMContentLoaded", () => {
  let selectedContainerId = null;
  let allContainers = []; // Store all containers for searching

  // Get all DOM elements
  const addBtn = document.getElementById("addContainerBtn");
  const addModal = document.getElementById("add-modal");
  const addForm = document.getElementById("add-container-form");
  const updateForm = document.getElementById("update-container-form");
  const archiveBtn = document.getElementById("archiveBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const cancelBtn = document.querySelector('#add-container-form button[type="button"]');

  // Initialize the app
  fetchContainers();
  setupDragAndDrop();

  // Add event listeners for search
  if (searchBtn && clearSearchBtn) {
    searchBtn.addEventListener("click", handleSearch);
    clearSearchBtn.addEventListener("click", clearSearch);
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") handleSearch();
    });
  }

  // Add event listener for cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeAddModal);
  }

  function setupDragAndDrop() {
    const columns = document.querySelectorAll('.container-list');
    
    columns.forEach(column => {
      column.addEventListener('dragover', e => {
        e.preventDefault();
        const draggable = document.querySelector('.dragging');
        if (draggable) {
          const afterElement = getDragAfterElement(column, e.clientY);
          if (afterElement) {
            column.insertBefore(draggable, afterElement);
          } else {
            column.appendChild(draggable);
          }
        }
      });
    });
  }

  function getDragAfterElement(column, y) {
    const draggableElements = [...column.querySelectorAll('.container-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  async function fetchContainers() {
    try {
      console.log("Fetching active containers...");
      const response = await fetch("http://198.245.53.14:5000/containers");
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const containers = await response.json();
      
      if (!Array.isArray(containers)) {
        throw new Error("Invalid containers data received");
      }
      
      console.log(`Fetched ${containers.length} active containers`);
      allContainers = containers;
      renderContainers(containers);
    } catch (err) {
      console.error("Fetch error:", err);
      alert(`Failed to load containers: ${err.message}`);
    }
  }

  function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
      renderContainers(allContainers);
      return;
    }

    const filteredContainers = allContainers.filter(container => {
      return (
        (container.id && container.id.toLowerCase().includes(searchTerm)) ||
        (container.blNumber && container.blNumber.toLowerCase().includes(searchTerm)) ||
        (container.size && container.size.toLowerCase().includes(searchTerm)) ||
        (container.shipping && container.shipping.toLowerCase().includes(searchTerm)) ||
        (container.location && container.location.toLowerCase().includes(searchTerm)) ||
        (container.damage && container.damage.toLowerCase().includes(searchTerm)) ||
        (container.notes && container.notes.toLowerCase().includes(searchTerm))
      );
    });

    renderContainers(filteredContainers);
  }

  function clearSearch() {
    searchInput.value = '';
    renderContainers(allContainers);
  }

  // Add Container Button
  if (addBtn && addModal) {
    addBtn.addEventListener("click", () => {
      addModal.classList.remove("hidden");
    });
  }

  if (addForm) {
    addForm.addEventListener("submit", function (e) {
      e.preventDefault();
  
      const containerData = {
        id: document.getElementById("containerId").value.trim(),
        blNumber: document.getElementById("blNumber").value.trim(),
        size: document.getElementById("size").value.trim(),
        shipping: document.getElementById("shipping").value.trim(),
        location: document.getElementById("location").value.trim(),
        damage: document.getElementById("damage").value.trim(),
        notes: document.getElementById("notes").value.trim(),
        priority: document.getElementById("priority").value,
        status: document.getElementById("status").value,
        created_at: document.getElementById("created_at").value || new Date().toISOString().slice(0, 10)
      };
  
      fetch("http://198.245.53.14:5000/containers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(containerData)
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to add container");
          return res.json();
        })
        .then(() => {
          closeAddModal();
          fetchContainers();
        })
        .catch(err => {
          console.error("Error adding container:", err);
          alert("Something went wrong while creating the container.");
        });
    });
  }

  if (updateForm) {
    updateForm.addEventListener("submit", async function (e) {
      e.preventDefault();
  
      const updatedData = {
        blNumber: document.getElementById("modalBlNumber").value.trim(),
        size: document.getElementById("modalSize").value.trim(),
        shipping: document.getElementById("modalShipping").value.trim(),
        location: document.getElementById("modalLocation").value.trim(),
        damage: document.getElementById("modalDamage").value.trim(),
        notes: document.getElementById("modalNotes").value.trim(),
        priority: document.getElementById("modalPriority").value,
        status: document.getElementById("modalStatus").value
      };
  
      try {
        const response = await fetch(
          `http://198.245.53.14:5000/containers/${selectedContainerId}`, 
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedData)
          }
        );
  
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Update failed");
        }
  
        document.getElementById("container-modal").classList.add("hidden");
        await fetchContainers();
      } catch (err) {
        console.error("Update error:", err);
        alert(`Failed to update container: ${err.message}`);
      }
    });
  }

  function renderContainers(containers) {
    document.querySelectorAll(".container-list").forEach(column => {
        column.innerHTML = "";
    });
  
    const activeContainers = containers.filter(c => c.status !== 'archived');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (activeContainers.length === 0) {
        document.querySelectorAll(".container-list").forEach(col => {
            col.innerHTML = "<p class='empty-state'>No containers in this status</p>";
        });
        return;
    }
  
    activeContainers.forEach(container => {
        const card = document.createElement("div");
        card.className = `container-card priority-${container.priority || 'new'}`;
        card.dataset.id = container.id;
        card.draggable = true;
  
        const highlight = (text) => {
          if (!searchTerm || !text) return text || "-";
          const regex = new RegExp(`(${searchTerm})`, 'gi');
          return text.toString().replace(regex, '<span class="highlight">$1</span>');
        };
  
        card.innerHTML = `
            <strong>${highlight(container.id)}</strong><br>
            BL#: ${highlight(container.blNumber || "-")}<br>
            Size: ${highlight(container.size || "-")}<br>
            Line: ${highlight(container.shipping || "-")}<br>
            Location: ${highlight(container.location || "-")}
        `;

        let isDragging = false;

        card.addEventListener("dragstart", e => {
            isDragging = true;
            card.classList.add('dragging');
            e.dataTransfer.setData("text/plain", container.id);
            e.dataTransfer.effectAllowed = "move";
        });

        card.addEventListener("dragend", () => {
            card.classList.remove('dragging');
            setTimeout(() => {
                isDragging = false;
            }, 50);
        });

        card.addEventListener("click", () => {
            if (!isDragging) {
                showContainerModal(container);
            }
        });

        const status = container.status || "working-on";
        const column = document.getElementById(status);
        
        if (column) {
            column.appendChild(card);
        } else {
            console.warn(`No column found for status: ${status}`);
        }
    });

    document.querySelectorAll('.container-list').forEach(column => {
      column.addEventListener('drop', async (e) => {
        e.preventDefault();
        const containerId = e.dataTransfer.getData("text/plain");
        const newStatus = column.id;
        
        const container = allContainers.find(c => c.id === containerId);
        if (!container) return;
        
        try {
          const response = await fetch(
            `http://198.245.53.14:5000/containers/${containerId}`, 
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...container,
                status: newStatus
              })
            }
          );
          
          if (!response.ok) throw new Error("Status update failed");
          await fetchContainers();
        } catch (err) {
          console.error("Error updating status:", err);
          alert("Failed to update container status");
        }
      });
    });
  }

  function showContainerModal(container) {
    selectedContainerId = container.id;

    // Update all fields in the modal
    document.getElementById("modalId").value = container.id;
    document.getElementById("modalBlNumber").value = container.blNumber || "";
    document.getElementById("modalSize").value = container.size || "";
    document.getElementById("modalShipping").value = container.shipping || "";
    document.getElementById("modalLocation").value = container.location || "";
    document.getElementById("modalPriority").value = container.priority || "new";
    document.getElementById("modalStatus").value = container.status || "working-on";
    document.getElementById("modalNotes").value = container.notes || "";
    document.getElementById("modalDamage").value = container.damage || "";
    
    // Format creation date with label
    const createdAt = container.created_at ? 
      `Created: ${new Date(container.created_at).toLocaleString()}` : 
      'Creation date not available';
    document.getElementById("modalCreatedAt").value = createdAt;

    // Load attachments
    loadAttachments(container.id);

    const modal = document.getElementById("container-modal");
    modal.classList.remove("hidden");
    modal.addEventListener("click", hideModalOnClickOutside);

    document.getElementById('modalAttachments').addEventListener('change', handleFileUpload);
  }

  async function loadAttachments(containerId) {
    const attachmentsContainer = document.createElement('div');
    attachmentsContainer.id = 'attachments-container';
    attachmentsContainer.innerHTML = '<h4>Attachments</h4><div id="attachments-list">Loading...</div>';
    
    const modalContent = document.querySelector('#container-modal .modal-content');
    const existingAttachments = document.getElementById('attachments-container');
    if (existingAttachments) {
      modalContent.replaceChild(attachmentsContainer, existingAttachments);
    } else {
      modalContent.appendChild(attachmentsContainer);
    }

    try {
      const response = await fetch(`http://198.245.53.14:5000/containers/${containerId}/attachments`);
      const attachments = await response.json();
      
      const attachmentsList = document.getElementById('attachments-list');
      if (attachments.length === 0) {
        attachmentsList.innerHTML = '<p>No attachments found</p>';
      } else {
        attachmentsList.innerHTML = attachments.map(attachment => `
          <div class="attachment-item">
            <a href="/uploads/${attachment.filename}" target="_blank">
              ${attachment.originalname}
            </a>
            <span>(${new Date(attachment.uploaded_at).toLocaleDateString()})</span>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading attachments:', err);
      document.getElementById('attachments-list').innerHTML = 
        '<p>Error loading attachments</p>';
    }
  }

  function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('attachments', files[i]);
    }

    fetch(`http://198.245.53.14:5000/containers/${selectedContainerId}/attachments`, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    })
    .then(() => {
      loadAttachments(selectedContainerId);
      document.getElementById('modalAttachments').value = '';
    })
    .catch(err => {
      console.error('Upload error:', err);
      alert('Failed to upload files');
    });
  }

  function hideModalOnClickOutside(e) {
    const modalContent = document.querySelector("#container-modal .modal-content");
    if (!modalContent.contains(e.target)) {
      document.getElementById("container-modal").classList.add("hidden");
      document.getElementById("container-modal").removeEventListener("click", hideModalOnClickOutside);
    }
  }

  // Archive Button
  if (archiveBtn) {
    archiveBtn.addEventListener("click", handleArchive);
  }

  // Delete Button
  if (deleteBtn) {
    deleteBtn.addEventListener("click", handleDelete);
  }

  async function handleDelete() {
    if (!selectedContainerId) return;
    
    if (!confirm("Are you sure you want to delete this container?")) return;
  
    try {
      const response = await fetch(`http://198.245.53.14:5000/containers/${selectedContainerId}`, {
        method: "DELETE"
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed");
      }
      
      document.getElementById("container-modal").classList.add("hidden");
      await fetchContainers();
      selectedContainerId = null;
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Delete failed: ${err.message}`);
    }
  }

  function handleArchive() {
    if (!selectedContainerId) return;
    
    fetch(`http://198.245.53.14:5000/containers/${selectedContainerId}/archive`, {
      method: "PATCH"
    })
      .then(res => {
        if (!res.ok) throw new Error("Archive failed");
        document.getElementById("container-modal").classList.add("hidden");
        fetchContainers();
      })
      .catch(err => {
        console.error("Archive error:", err);
        alert("Archive failed.");
      });
  }
});