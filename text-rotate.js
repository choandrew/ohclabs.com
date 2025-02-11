document.addEventListener('DOMContentLoaded', () => {
  // List of words to cycle through.
  const words = [
    "Distribution",
    "Logistics",
    "Branding",
    "Marketing",
    "Consultancy",
    "Data Analysis"
  ];
  
  // currentIndex points to the word that is currently centered (bright).
  let currentIndex = 0;
  
  // Each slot is 50px tall; rotation happens every 2000ms.
  const slotHeight = 50;
  const intervalDuration = 1500;
  
  const wheel = document.querySelector('.wheel');
  let isAnimating = false;
  
  // A safe modulo function.
  const mod = (n, m) => ((n % m) + m) % m;
  
  /**
   * Create a new <li> element.
   * @param {string} word - The text to display.
   * @param {string} cls - The CSS class for brightness.
   * @param {number} offset - The vertical offset (in pixels).
   * @returns {HTMLElement} The created list item.
   */
  function createLi(word, cls, offset) {
    const li = document.createElement('li');
    li.textContent = word;
    li.className = cls;
    li.dataset.offset = offset;
    li.style.transform = `translateY(${offset}px)`;
    return li;
  }
  
  /**
   * Build the initial set of 4 <li> elements:
   * - li[0]: off–screen above (offset = -50, class "incoming")
   * - li[1]: top visible slot (offset = 0, class "incoming")
   * - li[2]: center (offset = 50, class "current")
   * - li[3]: bottom visible (offset = 100, class "outgoing")
   */
  function buildInitialWheel() {
    wheel.innerHTML = "";
    const li0 = createLi(words[ mod(currentIndex + 2, words.length) ], "incoming", -slotHeight);
    const li1 = createLi(words[ mod(currentIndex + 1, words.length) ], "incoming", 0);
    const li2 = createLi(words[currentIndex], "current", slotHeight);
    const li3 = createLi(words[ mod(currentIndex - 1, words.length) ], "outgoing", 2 * slotHeight);
    wheel.appendChild(li0);
    wheel.appendChild(li1);
    wheel.appendChild(li2);
    wheel.appendChild(li3);
  }
  
  buildInitialWheel();
  
  /**
   * Rotate the wheel: slide every <li> down by 50px.
   */
  function rotate() {
    const lis = wheel.children;
    if (lis.length !== 4 || isAnimating) return;
    
    isAnimating = true;
    
    // Slide each li down by updating its stored offset and CSS transform.
    for (let li of lis) {
      let currentOffset = parseInt(li.dataset.offset, 10);
      currentOffset += slotHeight;
      li.dataset.offset = currentOffset;
      li.style.transform = `translateY(${currentOffset}px)`;
    }
    
    // Previously, we promoted the incoming word (lis[1]) to "current" immediately.
    // That caused a brief flash of high brightness. To fix this, we now only change
    // the class of the current word (lis[2]) to "outgoing" during the transition.
    requestAnimationFrame(() => {
      lis[2].classList.replace("current", "outgoing");
      // Note: We no longer change lis[1]'s class here. It remains "incoming" until the transition ends.
    });
    
    // When the bottom li (now off–screen) finishes its transform, update the wheel.
    lis[3].addEventListener('transitionend', onTransitionEnd, { once: true });
  }
  
  /**
   * Handle the end of the transition.
   * @param {TransitionEvent} e
   */
  function onTransitionEnd(e) {
    if (e.propertyName !== "transform") return;
    
    // Remove the li that slid off–screen.
    wheel.removeChild(wheel.lastElementChild);
    
    // Reset positions: subtract slotHeight from each li so that they return to their steady state.
    const lis = wheel.children;
    for (let li of lis) {
      let currentOffset = parseInt(li.dataset.offset, 10);
      currentOffset -= slotHeight;
      li.dataset.offset = currentOffset;
      li.style.transition = "none";  // Temporarily disable transition.
      li.style.transform = `translateY(${currentOffset}px)`;
      li.offsetHeight; // Force reflow.
      li.style.transition = "";
    }
    
    // Advance the current index so that the new center word is correct.
    currentIndex = mod(currentIndex + 1, words.length);
    
    // Update the remaining li’s to reflect the new steady state:
    //   - li[0] (top off–screen): word for incoming.
    //   - li[1] (top visible): word for incoming.
    //   - li[2] (center): word for current (bright).
    lis[0].textContent = words[ mod(currentIndex + 2, words.length) ];
    lis[1].textContent = words[ mod(currentIndex + 1, words.length) ];
    lis[2].textContent = words[currentIndex];
    lis[0].className = "incoming";
    lis[1].className = "incoming";
    lis[2].className = "current";
    
    // Append a new li at the bottom for the outgoing word.
    const newOutgoing = createLi(words[ mod(currentIndex - 1, words.length) ], "outgoing", 2 * slotHeight);
    wheel.appendChild(newOutgoing);
    
    isAnimating = false;
  }
  
  // Start the rotation at regular intervals.
  setInterval(rotate, intervalDuration);
});
