// Update format help text when mode changes
    document.getElementById('mode').addEventListener('change', function() {
      const mode = this.value;
      const helpText = document.getElementById('formatHelp');
      if (mode === 'ftc') {
        helpText.textContent = 'Format: Feet+Frames (e.g., 100+05, 250+12, 0+08)';
      } else {
        helpText.textContent = 'Format: HH:MM:SS:FF (e.g., 01:23:45:12, 00:05:30:00)';
      }
    });

    function isValidInteger(value) {
      if (typeof value !== 'string') return false;
      if (value === '') return true;
      if (/[eE\.\+\-]/.test(value)) return false;
      const num = Number(value);
      return Number.isInteger(num) && num >= 0;
    }

    function convertFootageToTimecode(feet, frames, fps, reel) {
      const totalFrames = feet * 16 + frames;
      const hh = Math.floor(totalFrames / (fps * 3600)) + reel;
      const mm = Math.floor((totalFrames / (fps * 60)) % 60);
      const ss = Math.floor((totalFrames / fps) % 60);
      const ff = totalFrames % fps;
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
    }

    function convertTimecodeToFootage(timecode, fps, reel) {
      const parts = timecode.split(':').map(Number);
      if (parts.length !== 4 || parts.some(isNaN)) {
        throw new Error('Invalid timecode format');
      }
      const [hh, mm, ss, ff] = parts;
      if (ff >= fps) {
        throw new Error(`Frame value exceeds FPS`);
      }
      if (reel > hh) {
        throw new Error('Reel > HH');
      }
      const adjustedHours = Math.max(0, hh - reel);
      const totalFrames = adjustedHours * fps * 3600 + mm * fps * 60 + ss * fps + ff;
      if (totalFrames < 0) {
        throw new Error('Timecode before reel start');
      }
      const feet = Math.floor(totalFrames / 16);
      const frames = totalFrames % 16;
      return `${feet}+${String(frames).padStart(2, '0')}`;
    }

    function batchConvert() {
      const mode = document.getElementById('mode').value;
      const fpsOption = document.getElementById('fpsSelect').value;
      const fps = (fpsOption === '23.98/24') ? 24 : 25;
      const reel = parseInt(document.getElementById('reel').value) || 1;
      const input = document.getElementById('input').value.trim();

      if (!input) {
        showMessage('Please enter values to convert', 'error');
        return;
      }

      const lines = input.split('\n').filter(line => line.trim() !== '');
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        let output = '';
        let status = '';
        let error = false;

        try {
          if (mode === 'ftc') {
            // Footage to Timecode
            const match = trimmedLine.match(/^(\d+)\+(\d+)$/);
            if (!match) {
              throw new Error('Invalid footage format');
            }
            const feet = parseInt(match[1]);
            const frames = parseInt(match[2]);
            
            if (frames > 15) {
              throw new Error('Frames > 15');
            }
            
            output = convertFootageToTimecode(feet, frames, fps, reel);
            status = '✓ Success';
            successCount++;
          } else {
            // Timecode to Footage
            output = convertTimecodeToFootage(trimmedLine, fps, reel);
            status = '✓ Success';
            successCount++;
          }
        } catch (e) {
          output = '—';
          status = `✗ Error: ${e.message}`;
          error = true;
          errorCount++;
        }

        results.push({
          number: index + 1,
          input: trimmedLine,
          output: output,
          fps: fpsOption,
          reel: reel,
          status: status,
          error: error
        });
      });

      displayResults(results, successCount, errorCount, mode, fpsOption, reel);
    }

    function displayResults(results, successCount, errorCount, mode, fps, reel) {
      const resultsSection = document.getElementById('resultsSection');
      const summary = document.getElementById('summary');
      const tbody = document.getElementById('resultsBody');

      // Show results section
      resultsSection.style.display = 'block';

      // Update summary
      const total = successCount + errorCount;
      summary.innerHTML = `Total: ${total} | Success: <span style="color: #4CAF50;">${successCount}</span> | Errors: <span style="color: #f44336;">${errorCount}</span>`;
      
      if (errorCount === 0) {
        summary.className = 'summary success';
      } else if (successCount === 0) {
        summary.className = 'summary error';
      } else {
        summary.className = 'summary';
      }

      // Clear and populate table
      tbody.innerHTML = '';
      results.forEach(result => {
        const row = tbody.insertRow();
        row.innerHTML = `
          <td>${result.number}</td>
          <td>${result.input}</td>
          <td>${result.output}</td>
          <td class="${result.error ? 'status-error' : 'status-success'}">${result.status}</td>
        `;
      });

      // Store results and settings globally for export
      window.batchResults = results;
      window.batchSettings = { mode, fps, reel };

      // Scroll to results
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function copyResults() {
      const table = document.getElementById('resultsTable');
      let text = '';
      
      // Copy as tab-separated values (works well with Excel)
      for (let row of table.rows) {
        let rowData = [];
        for (let cell of row.cells) {
          rowData.push(cell.textContent);
        }
        text += rowData.join('\t') + '\n';
      }

      navigator.clipboard.writeText(text).then(() => {
        showMessage('Table copied to clipboard! You can paste it into Excel or Google Sheet.', 'success');
      }).catch(err => {
        showMessage('Failed to copy table', 'error');
      });
    }

    function exportTXT() {
      if (!window.batchResults || !window.batchSettings) return;

      const { mode, fps, reel } = window.batchSettings;
      const modeText = mode === 'ftc' ? 'Footage → Timecode' : 'Timecode → Footage';

      let txt = 'Batch Conversion Results\n';
      txt += `Mode: ${modeText}\n`;
      txt += `FPS: ${fps}\n`;
      txt += `Reel: ${reel}\n`;
      txt += '\n';

      // Formattcing Each Column
      const numWidth = Math.max(...window.batchResults.map(r => String(r.number).length)) + 2;
      const inputWidth = Math.max(...window.batchResults.map(r => String(r.input).length)) + 4;
      const outputWidth = Math.max(...window.batchResults.map(r => String(r.output).length)) + 4;
      const statusWidth = Math.max(...window.batchResults.map(r => String(r.status).length)) + 2;
      const pad = (str, len) => String(str).padEnd(len, ' ');

      const header =
      pad('#', numWidth) +'\t'+ pad('Input', inputWidth)+'\t'+ pad('Output', outputWidth)+'\t'+ pad('Status', statusWidth);

      txt += header + '\n';

      window.batchResults.forEach(result => {
      const num = pad(result.number, numWidth);
      const input = pad(result.input, inputWidth);
      const output = pad(result.output, outputWidth);
      const status = pad(result.status, statusWidth);
      txt += `${num}\t${input}\t${output}\t${status}\n`;});

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      const timestamp = `${yyyy}-${mm}-${dd}_${hh}-${min}`;
      const filename = `batch-conversion_${timestamp}.txt`;
      
      downloadFile(txt, filename, 'text/plain');
      showMessage('TXT file downloaded!', 'success');
    }

    function downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function clearAll() {
      document.getElementById('input').value = '';
      document.getElementById('resultsSection').style.display = 'none';
      document.getElementById('message').innerHTML = '';
      window.batchResults = null;
      window.batchSettings = null;
    }

    function showMessage(text, type) {
      const messageDiv = document.getElementById('message');
      messageDiv.textContent = text;
      messageDiv.className = `message ${type}`;
      setTimeout(() => {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
      }, 3000);
    }
