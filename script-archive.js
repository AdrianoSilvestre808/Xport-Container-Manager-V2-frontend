document.addEventListener("DOMContentLoaded", () => {
  // State variables
  let selectedArchivedContainerId = null;
  let allContainers = [];
  let jobNotTakenContainers = [];

  // DOM Elements
  const archiveContainer = document.getElementById("archived-containers");
  const jobNotTakenContainer = document.getElementById("job-not-taken-container");
  const toggleBtn = document.getElementById("toggleHiddenSectionBtn");
  const hiddenSection = document.getElementById("job-not-taken-section");
  const jobNotTakenCount = document.getElementById("job-not-taken-count");
  const restoreBtn = document.getElementById("modal-restore");
  const deleteBtn = document.getElementById("modal-delete");
  const moveToJobNotTakenBtn = document.getElementById("modal-move-to-job-not-taken");
  const moveToArchiveBtn = document.getElementById("modal-move-to-archive");
  const modal = document.getElementById("archived-modal");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  // ======================
  //  HELPER FUNCTIONS
  // ======================
  const handleFetchError = (error) => {
    console.error("Error:", error);
    if (archiveContainer) {
      archiveContainer.innerHTML = `
        <p class="error-state">
          Failed to load archived containers. Please refresh the page.
        </p>
      `;
    }
  };

  const showToast = (message) => {
    console.log("Notification:", message);
    // Implement actual toast notification here
  };

  const closeModalAndRefresh = () => {
    modal?.classList.add("hidden");
    fetchArchivedContainers().catch(handleFetchError);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // ======================
  //  RENDER FUNCTIONS
  // ======================
  const createContainerCard = (container) => {
    const isJobNotTaken = container.job_status === 'job_not_taken';
    const archivedDate = formatDate(container.archived_at);
    
    return `
      <div class="container-card ${isJobNotTaken ? 'job-not-taken-card' : ''}" data-id="${container.id}">
        <h3>${container.id}</h3>
        <p><strong>BL#:</strong> ${container.blNumber || "-"}</p>
        <p><strong>Size:</strong> ${container.size || "-"}</p>
        <p><strong>Line:</strong> ${container.shipping || "-"}</p>
        <small>${isJobNotTaken ? 'Job Not Taken' : 'Archived'}</small>
        <div class="timestamp">Archived: ${archivedDate}</div>
      </div>
    `;
  };

  const renderArchivedContainers = (containers) => {
    if (!archiveContainer || !jobNotTakenContainer) {
      console.error("Container elements not found");
      return;
    }

    // Separate containers
    const regularContainers = containers.filter(c => c.job_status !== 'job_not_taken');
    jobNotTakenContainers = containers.filter(c => c.job_status === 'job_not_taken');

    // Render regular archived containers
    archiveContainer.innerHTML = regularContainers.length > 0 
      ? regularContainers.map(createContainerCard).join("")
      : "<p class='empty-state'>No archived containers found</p>";

    // Render job not taken containers
    jobNotTakenContainer.innerHTML = jobNotTakenContainers.length > 0 
      ? jobNotTakenContainers.map(createContainerCard).join("")
      : "<p class='empty-state'>No job not taken containers found</p>";

    // Update count
    jobNotTakenCount.textContent = `${jobNotTakenContainers.length} containers`;
  };

  const renderAttachments = (files) => {
    const attachmentsList = document.getElementById("archived-attachments-list");
    if (!attachmentsList) return;

    if (!Array.isArray(files)) {
      attachmentsList.innerHTML = "<em>No files</em>";
      return;
    }

    attachmentsList.innerHTML = files.length > 0
      ? files.map(file => `
          <div class="attachment-item">
            <a href="/uploads/${file.filename}" target="_blank" download="${file.originalname}">
              ${file.originalname || "File"}
            </a>
            <span>(${new Date(file.uploaded_at).toLocaleDateString()})</span>
          </div>
        `).join("")
      : "<em>No attachments found</em>";
  };

  // ======================
  //  MODAL FUNCTIONS
  // ======================
  const populateModalFields = (container) => {
    const fields = {
      "archivedModalId": container.id,
      "archivedModalBlNumber": container.blNumber,
      "archivedModalSize": container.size,
      "archivedModalShipping": container.shipping,
      "archivedModalStatus": container.status,
      "archivedModalNotes": container.notes,
      "archivedModalArchivedAt": formatDate(container.archived_at)
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value || "";
    });

    // Show/hide move buttons based on current status
    const isJobNotTaken = container.job_status === 'job_not_taken';
    moveToJobNotTakenBtn.style.display = isJobNotTaken ? 'none' : 'block';
    moveToArchiveBtn.style.display = isJobNotTaken ? 'block' : 'none';
  };

  const hideArchivedModalOutside = (e) => {
    const modalContent = document.querySelector("#archived-modal .modal-content");
    if (modal && modalContent && !modalContent.contains(e.target)) {
      modal.classList.add("hidden");
      modal.removeEventListener("click", hideArchivedModalOutside);
    }
  };

  const displayAttachments = async (containerId) => {
    const attachmentsList = document.getElementById("archived-attachments-list");
    if (!attachmentsList) return;

    attachmentsList.innerHTML = "<em>Loading attachments...</em>";

    try {
      const response = await fetch(`http://localhost:5000/containers/${containerId}/attachments`);
      if (!response.ok) throw new Error("Failed to fetch attachments");
      
      const files = await response.json();
      renderAttachments(files);
    } catch (error) {
      console.error("Attachment error:", error);
      attachmentsList.innerHTML = "<em>Error loading files</em>";
    }
  };

  const showArchivedModal = async (container) => {
    try {
      selectedArchivedContainerId = container.id;
      populateModalFields(container);
      
      modal?.classList.remove("hidden");
      modal?.addEventListener("click", hideArchivedModalOutside);

      await displayAttachments(container.id);
    } catch (error) {
      console.error("Error showing modal:", error);
    }
  };

  // ======================
  //  ACTION HANDLERS
  // ======================
  const handleMoveToJobNotTaken = async () => {
    if (!selectedArchivedContainerId) {
      alert("No container selected");
      return;
    }
    
    console.log("Attempting to move container to Job Not Taken:", selectedArchivedContainerId);
    
    try {
      const response = await fetch(
        `http://localhost:5000/containers/${selectedArchivedContainerId}/job-status`,
        {
          method: "PATCH",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_status: 'job_not_taken' })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Move failed");
      }
      
      closeModalAndRefresh();
      showToast("Moved to Job Not Taken");
    } catch (error) {
      console.error("Move error:", error);
      alert(`Failed to move container: ${error.message}`);
    }
  };

  const handleMoveToArchive = async () => {
    if (!selectedArchivedContainerId) {
      alert("No container selected");
      return;
    }
    
    console.log("Attempting to move container to Archive:", selectedArchivedContainerId);
    
    try {
      const response = await fetch(
        `http://localhost:5000/containers/${selectedArchivedContainerId}/job-status`,
        {
          method: "PATCH",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_status: 'archived' })
        }
      );
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Move failed");
      }
      
      closeModalAndRefresh();
      showToast("Moved to regular archive");
    } catch (error) {
      console.error("Move error:", error);
      alert(`Failed to move container: ${error.message}`);
    }
  };

  const handleRestore = async () => {
    if (!selectedArchivedContainerId) {
      alert("No container selected");
      return;
    }
    
    try {
      const response = await fetch(
        `http://localhost:5000/containers/${selectedArchivedContainerId}/restore`,
        { method: "PATCH" }
      );
      
      if (!response.ok) throw new Error("Restore failed");
      
      closeModalAndRefresh();
      showToast("Container restored successfully");
    } catch (error) {
      console.error("Restore error:", error);
      alert("Failed to restore container. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!selectedArchivedContainerId) return;
    if (!confirm("Are you sure you want to permanently delete this container?")) return;
    
    try {
      const response = await fetch(
        `http://localhost:5000/containers/${selectedArchivedContainerId}`,
        { method: "DELETE" }
      );
      
      if (!response.ok) throw new Error("Delete failed");
      
      closeModalAndRefresh();
      showToast("Container deleted permanently");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete container. Please try again.");
    }
  };

  // ======================
  //  SEARCH FUNCTIONS
  // ======================
  const handleSearch = () => {
    const searchTerm = searchInput.value.toLowerCase();
    if (!searchTerm) {
      renderArchivedContainers(allContainers);
      return;
    }

    const filtered = allContainers.filter(container => 
      container.id.toLowerCase().includes(searchTerm) ||
      (container.blNumber && container.blNumber.toLowerCase().includes(searchTerm)) ||
      (container.shipping && container.shipping.toLowerCase().includes(searchTerm))
    );

    renderArchivedContainers(filtered);
  };

  // ======================
  //  MAIN FUNCTIONS
  // ======================
  const fetchArchivedContainers = async () => {
    try {
      const response = await fetch("http://localhost:5000/containers/archived");
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const containers = await response.json();
      if (!Array.isArray(containers)) throw new Error("Invalid data format received");
      
      allContainers = containers;
      renderArchivedContainers(containers);
    } catch (error) {
      console.error("Failed to fetch archived containers:", error);
      throw error;
    }
  };

  // ======================
  //  INITIALIZATION
  // ======================
  if (archiveContainer) {
    fetchArchivedContainers().catch(handleFetchError);
  }

  // Event Listeners
  toggleBtn?.addEventListener("click", () => {
    hiddenSection.classList.toggle("visible");
    toggleBtn.innerHTML = hiddenSection.classList.contains("visible")
      ? '<i class="fas fa-eye"></i> Hide Job Not Taken'
      : '<i class="fas fa-eye-slash"></i> Show Job Not Taken';
  });

  restoreBtn?.addEventListener("click", handleRestore);
  deleteBtn?.addEventListener("click", handleDelete);
  moveToJobNotTakenBtn?.addEventListener("click", handleMoveToJobNotTaken);
  moveToArchiveBtn?.addEventListener("click", handleMoveToArchive);
  searchBtn?.addEventListener("click", handleSearch);
  clearSearchBtn?.addEventListener("click", () => {
    searchInput.value = "";
    renderArchivedContainers(allContainers);
  });

  searchInput?.addEventListener("keyup", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".container-card");
    if (card) {
      const containerId = card.dataset.id;
      const container = allContainers.find(c => c.id === containerId);
      if (container) showArchivedModal(container);
    }
  });
});