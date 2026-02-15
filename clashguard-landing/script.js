const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const fileName = document.getElementById('fileName');
const continueBtn = document.getElementById('continueBtn');

let selectedFile = null;

const allowedExtensions = ['.xlsx', '.xls', '.csv'];

const isAllowedFile = (name) => {
  const lower = name.toLowerCase();
  return allowedExtensions.some((ext) => lower.endsWith(ext));
};

const setSelectedFile = (file) => {
  if (!file) return;
  if (!isAllowedFile(file.name)) {
    fileName.textContent = 'Invalid file format. Upload .xlsx, .xls, or .csv';
    fileName.style.color = '#b10000';
    selectedFile = null;
    continueBtn.disabled = true;
    return;
  }

  selectedFile = file;
  fileName.style.color = '#2b2b2b';
  fileName.textContent = `Selected: ${file.name}`;
  continueBtn.disabled = false;
};

fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  setSelectedFile(file);
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files?.[0];
  setSelectedFile(file);
});

continueBtn.addEventListener('click', () => {
  if (!selectedFile) return;
  sessionStorage.setItem('clashguard_uploaded_file_name', selectedFile.name);
  alert(`File loaded: ${selectedFile.name}\nNext step: parse and run clash detection.`);
});
