let selectedText = "";
let contextMenu = null;
let floatingWindow = null;

function initializeExtension() {
  console.log("Initializing extension");
  createFloatingWindow();
  addGlobalEventListeners();
}

function createFloatingWindow() {
  console.log("Creating floating window");
  floatingWindow = document.createElement("div");
  floatingWindow.className = "floating-window";
  floatingWindow.textContent = "📌";
  document.body.appendChild(floatingWindow);

  floatingWindow.addEventListener("mouseover", showRecordedItems);
  floatingWindow.addEventListener("click", toggleLists);
}

function addGlobalEventListeners() {
  console.log("Adding global event listeners");
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("mousedown", handleGlobalMouseDown);
}

function handleMouseUp(e) {
  e.stopPropagation(); // 阻止事件冒泡
  selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    console.log("Text selected:", selectedText);
    setTimeout(() => showContextMenu(e.pageX, e.pageY), 0);
  } else {
    removeContextMenu();
  }
}

function showContextMenu(x, y) {
  console.log("Showing context menu");
  removeContextMenu();

  contextMenu = document.createElement("div");
  contextMenu.className = "wcr-context-menu";
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.style.position = "absolute";
  contextMenu.style.zIndex = "9999";

  const saveButton = document.createElement("button");
  saveButton.className = "wcr-save-button";
  saveButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>';
  saveButton.title = "Save Selection";

  contextMenu.appendChild(saveButton);
  document.body.appendChild(contextMenu);

  console.log("Context menu created and added to DOM");
}

function handleGlobalMouseDown(e) {
  console.log("Global mousedown detected", e.target);
  if (contextMenu) {
    if (contextMenu.contains(e.target)) {
      console.log("Mousedown inside context menu");
      if (e.target.closest('.wcr-save-button')) {
        console.log("Save button clicked");
        saveSelection();
      }
    } else {
      console.log("Mousedown outside context menu");
      removeContextMenu();
    }
  }
}


function saveSelection() {
  console.log("Saving selection:", selectedText);
  const paragraph = window.getSelection().anchorNode.parentElement;
  const data = {
    type: "text",
    content: selectedText,
    paragraph: paragraph.textContent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  console.log("Data to save:", data);

  chrome.runtime.sendMessage({ action: "saveData", data: data }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending message:", chrome.runtime.lastError);
    } else {
      console.log("Save response:", response);
      removeContextMenu();
      // 清除选中状态
      window.getSelection().removeAllRanges();
    }
  });
  
}

function removeContextMenu() {
  if (contextMenu) {
    console.log("Removing context menu");
    contextMenu.remove();
    contextMenu = null;
  }
}

function showRecordedItems() {
  console.log("FloatingWindow Showing recorded items");

  // 创建或获取显示记录的容器
  let recordsContainer = document.getElementById("floatingRecordsContainer");
  if (!recordsContainer) {
    recordsContainer = document.createElement("div");
    recordsContainer.id = "floatingRecordsContainer";
    recordsContainer.style.position = "fixed";
    recordsContainer.style.bottom = "60px";
    recordsContainer.style.right = "20px";
    recordsContainer.style.backgroundColor = "#fff";
    recordsContainer.style.color = "#333";
    recordsContainer.style.border = "1px solid #ccc";
    recordsContainer.style.padding = "10px";
    recordsContainer.style.borderRadius = "4px";
    recordsContainer.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
    recordsContainer.style.zIndex = "1000";
    document.body.appendChild(recordsContainer);

    let floatingWindow = document.getElementById("floatingWindow");

    // 添加鼠标移开事件监听器
    recordsContainer.addEventListener("mouseleave", () => {
      recordsContainer.style.display = "none";
    });
  }

  // 显示记录容器和浮动窗口
  recordsContainer.style.display = "block";
  floatingWindow.style.display = "block";

  // 清空容器内容
  recordsContainer.innerHTML = "";

  // 获取记录并显示
  chrome.storage.sync.get("records", (data) => {
    const records = data.records || [];

    if (records.length === 0) {
      recordsContainer.innerHTML = "<p>No items saved yet.</p>";
    } else {
      records.forEach((record, index) => {
        const item = document.createElement("div");
        item.className = "record-item";
        item.innerHTML = `
          <strong>${record.type === "text" ? "Text" : "Screenshot"}</strong>
          <p>${record.content.substring(0, 50)}${record.content.length > 50 ? "..." : ""}</p>
          <small>${new Date(record.timestamp).toLocaleString()}</small>
          <button class="delete-btn" data-index="${index}">Delete</button>
        `;
        item.addEventListener("click", (e) => {
          if (!e.target.classList.contains("delete-btn")) {
            const url = chrome.runtime.getURL(`records.html?index=${index}`);
            window.location.href = url;
          }
        });
        recordsContainer.appendChild(item);
      });

      const clearAllBtn = document.createElement("button");
      clearAllBtn.id = "clearAllBtn";
      clearAllBtn.textContent = "Clear All";
      recordsContainer.appendChild(clearAllBtn);

      clearAllBtn.addEventListener("click", () => {
        chrome.storage.sync.set({ records: [] }, () => {
          showRecordedItems();
        });
      });

      recordsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
          const index = parseInt(e.target.getAttribute("data-index"));
          deleteRecord(index);
        }
      });
    }
  });

  // 添加鼠标移开事件监听器
  let hideTimeout;
  const hideContainers = () => {
    hideTimeout = setTimeout(() => {
      recordsContainer.style.display = "none";
    }, 200);
  };

  const cancelHide = () => {
    clearTimeout(hideTimeout);
  };

  recordsContainer.addEventListener("mouseleave", hideContainers);
  floatingWindow.addEventListener("mouseleave", hideContainers);
  recordsContainer.addEventListener("mouseenter", cancelHide);
  floatingWindow.addEventListener("mouseenter", cancelHide);
}

function deleteRecord(index) {
  chrome.storage.sync.get("records", (data) => {
    const records = data.records || [];
    records.splice(index, 1);
    chrome.storage.sync.set({ records: records }, () => {
      showRecordedItems();
    });
  });
}

function toggleLists() {
  console.log("Toggling lists");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}