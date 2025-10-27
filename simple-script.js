function preventInvalidChars(e) {
      // Prevent: e, E, +, -, . (decimal point)
      if (['e', 'E', '+', '-', '.'].includes(e.key)) {
        e.preventDefault();
      }
    }

    function toggleMode() {
      const mode = document.getElementById('mode').value;
      document.getElementById('ftc-section').style.display = (mode === 'ftc') ? 'block' : 'none';
      document.getElementById('ctf-section').style.display = (mode === 'ctf') ? 'block' : 'none';
      autoConvert();
    }

    function autoConvert() {
      const mode = document.getElementById('mode').value;
      if (mode === 'ftc') {
        convertToTimecode();
      } else if (mode === 'ctf') {
        convertToFootage();
      }
    }

    function handleEnterKey(event, mode) {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (mode === 'ftc') {
          convertToTimecode();
        } else if (mode === 'ctf') {
          convertToFootage();
        }
      }
    }

    function copyToClipboard(resultId, messageId, valueOnly) {
      let resultText = document.getElementById(resultId).textContent;
      const messageElement = document.getElementById(messageId);
      
      // Don't copy placeholder text or error messages
      if (resultText === 'HH:MM:SS:FF' || resultText === 'Feet+Frames' || resultText.startsWith('Error:') || resultText.startsWith('Invalid')) {
        return;
      }

      // Store original text before modification
      const originalText = resultText;

      // If valueOnly is true, remove colons and plus signs
      if (valueOnly) {
        resultText = resultText.replace(/[:+]/g, '');
      }

      navigator.clipboard.writeText(resultText).then(function() {
        // Show message
        messageElement.textContent = `Copied: ${resultText}`;
        
        setTimeout(function() {
          messageElement.textContent = '';
        }, 2000);
      }).catch(function(err) {
        console.error('Failed to copy:', err);
        messageElement.textContent = 'Failed to copy';
        messageElement.style.color = '#f44336';
        
        setTimeout(function() {
          messageElement.textContent = '';
          messageElement.style.color = '#4CAF50';
        }, 2000);
      });
    }

    function formatTimecode(input) {
      // Remove all non-digit characters
      let value = input.value.replace(/\D/g, '');
      
      // Limit to 8 digits
      if (value.length > 8) {
        value = value.substring(0, 8);
      }
      
      // Format as HH:MM:SS:FF
      let formatted = '';
      if (value.length > 0) {
        formatted = value.substring(0, Math.min(2, value.length));
      }
      if (value.length > 2) {
        formatted += ':' + value.substring(2, Math.min(4, value.length));
      }
      if (value.length > 4) {
        formatted += ':' + value.substring(4, Math.min(6, value.length));
      }
      if (value.length > 6) {
        formatted += ':' + value.substring(6, 8);
      }
      
      input.value = formatted;
    }

    function formatTimecodeAndConvert(input) {
      formatTimecode(input);
      autoConvert();
    }

    function isValidInteger(value) {
      // Check if the string contains only digits (and optional leading minus for checking negatives)
      // Also reject values containing 'e', 'E', '.', or '+'
      if (typeof value !== 'string') return false;
      if (value === '') return true; // Empty is valid (will default to 0)
      if (/[eE\.\+\-]/.test(value)) return false; // Reject scientific notation, decimals, plus and minus signs
      const num = Number(value);
      return Number.isInteger(num) && num >= 0;
    }

    function convertToTimecode() {
      const resultElement = document.getElementById('result1');
      
      try {
        const feetInput = document.getElementById('feet').value.trim();
        const framesInput = document.getElementById('frames').value.trim();
        const reelInput = document.getElementById('reel').value.trim();
        const fpsOption = document.getElementById('fpsSelect').value;
        
        // Validate reel number (must not be empty and must be a valid integer)
        if (reelInput === '' || !isValidInteger(reelInput)) {
          resultElement.textContent = 'Invalid Footage Input';
          resultElement.classList.add('error');
          return;
        }
        
        const reel = parseInt(reelInput);
        
        // Empty feet and frames is okay (defaults to 0)
        let feet = 0;
        let frames = 0;
        
        // Validate feet if not empty
        if (feetInput !== '') {
          if (!isValidInteger(feetInput)) {
            resultElement.textContent = 'Invalid Footage Input';
            resultElement.classList.add('error');
            return;
          }
          feet = parseInt(feetInput);
        }
        
        // Validate frames if not empty
        if (framesInput !== '') {
          if (!isValidInteger(framesInput)) {
            resultElement.textContent = 'Invalid Footage Input';
            resultElement.classList.add('error');
            return;
          }
          frames = parseInt(framesInput);
          
          // Check if frames > 15
          if (frames > 15) {
            resultElement.textContent = 'Invalid Footage Input';
            resultElement.classList.add('error');
            return;
          }
        }
        
        // Determine FPS based on option
        const fps = (fpsOption === '23.98/24') ? 24 : 25;

        const totalFrames = feet * 16 + frames;
        const hh = Math.floor(totalFrames / (fps * 3600)) + reel;
        const mm = Math.floor((totalFrames / (fps * 60)) % 60);
        const ss = Math.floor((totalFrames / fps) % 60);
        const ff = totalFrames % fps;

        const result = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
        resultElement.textContent = result;
        resultElement.classList.remove('error');
      } catch (error) {
        resultElement.textContent = 'Invalid Footage Input';
        resultElement.classList.add('error');
      }
    }

    function convertToFootage() {
      const resultElement = document.getElementById('result2');
      
      try {
        const timecode = document.getElementById('timecode').value.trim();
        const fpsOption = document.getElementById('fpsSelect').value;
        const reelInput = document.getElementById('reel').value.trim();

        // Validate reel number (must not be empty and must be a valid integer)
        if (reelInput === '' || !isValidInteger(reelInput)) {
          resultElement.textContent = 'Invalid Timecode Input';
          resultElement.classList.add('error');
          return;
        }
        
        const reel = parseInt(reelInput);

        if (!timecode) {
          resultElement.textContent = 'Feet+Frames';
          resultElement.classList.remove('error');
          return;
        }

        // Determine FPS based on option
        const fps = (fpsOption === '23.98/24') ? 24 : 25;

        const parts = timecode.split(':').map(Number);

        // Validate timecode format
        if (parts.length !== 4 || parts.some(isNaN)) {
          resultElement.textContent = 'Error: Invalid timecode format (use HH:MM:SS:FF)';
          resultElement.classList.add('error');
          return;
        }

        const [hh, mm, ss, ff] = parts;

        // Validate that reel number is not larger than HH
        if (reel > hh) {
          resultElement.textContent = 'Invalid Timecode Input';
          resultElement.classList.add('error');
          return;
        }

        // Validate frame count doesn't exceed FPS
        if (ff >= fps) {
          resultElement.textContent = `Error: Frame value (${ff}) exceeds FPS (${fps})`;
          resultElement.classList.add('error');
          return;
        }

        // Calculate with reel offset
        const adjustedHours = Math.max(0, hh - reel);
        const totalFrames = adjustedHours * fps * 3600 + mm * fps * 60 + ss * fps + ff;

        if (totalFrames < 0) {
          resultElement.textContent = 'Error: Timecode is before reel start';
          resultElement.classList.add('error');
          return;
        }

        const feet = Math.floor(totalFrames / 16);
        const frames = totalFrames % 16;

        const result = `${feet}+${String(frames).padStart(2, '0')}`;
        resultElement.textContent = result;
        resultElement.classList.remove('error');
      } catch (error) {
        resultElement.textContent = 'Invalid Timecode Input';
        resultElement.classList.add('error');
      }
    }
