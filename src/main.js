(function () {
  const Data = window.GameData;
  const select = document.getElementById('character-select');
  const menu = document.getElementById('menu');
  const gameOver = document.getElementById('game-over');
  const startButton = document.getElementById('start-button');
  const restartButton = document.getElementById('restart-button');
  let selectedCharacter = null;
  let game;

  window.GameInput = { x: 0, y: 0 };

  const fields = {
    level: document.getElementById('level-display'), attack: document.getElementById('attack-display'),
    hp: document.getElementById('hp-display'), score: document.getElementById('score-display'),
    xp: document.getElementById('xp-display'), xpBar: document.getElementById('xp-bar')
  };

  window.GameUI = {
    updateHud(stats) {
      fields.level.textContent = stats.level;
      fields.attack.textContent = stats.attack;
      fields.hp.textContent = `${stats.hp} / ${stats.maxHp}`;
      fields.score.textContent = stats.score;
      fields.xp.textContent = `${stats.xp} / ${stats.xpNeeded}`;
      fields.xpBar.style.width = `${(stats.xp / stats.xpNeeded) * 100}%`;
    },
    showGameOver(stats) {
      document.getElementById('final-level').textContent = stats.level;
      document.getElementById('final-score').textContent = stats.score;
      document.getElementById('final-kills').textContent = stats.kills;
      gameOver.classList.remove('hidden');
    }
  };

  Object.entries(Data.characters).forEach(([key, character]) => {
    const button = document.createElement('button');
    button.className = 'character-button';
    button.type = 'button';
    button.dataset.character = key;
    button.innerHTML = `<span class="character-icon">${character.icon}</span><span class="character-name">${character.name}</span><span class="character-desc">${character.desc}</span>`;
    button.addEventListener('click', () => {
      selectedCharacter = key;
      select.querySelectorAll('button').forEach(item => item.classList.toggle('selected', item === button));
      startButton.disabled = false;
    });
    select.appendChild(button);
  });

  const moveStick = document.getElementById('move-stick');
  const moveKnob = document.getElementById('move-knob');
  let activePointerId = null;

  function updateMoveStick(event) {
    const rect = moveStick.getBoundingClientRect();
    const limit = rect.width * 0.29;
    let x = event.clientX - (rect.left + rect.width / 2);
    let y = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    if (distance > limit) { x = (x / distance) * limit; y = (y / distance) * limit; }
    window.GameInput.x = x / limit;
    window.GameInput.y = y / limit;
    moveKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    moveStick.setAttribute('aria-valuenow', Math.round(Math.hypot(window.GameInput.x, window.GameInput.y) * 100));
  }

  function releaseMoveStick() {
    activePointerId = null;
    window.GameInput.x = 0;
    window.GameInput.y = 0;
    moveKnob.style.transform = 'translate(-50%, -50%)';
    moveStick.setAttribute('aria-valuenow', '0');
  }

  moveStick.addEventListener('pointerdown', event => {
    activePointerId = event.pointerId;
    moveStick.setPointerCapture(event.pointerId);
    updateMoveStick(event);
  });
  moveStick.addEventListener('pointermove', event => {
    if (event.pointerId === activePointerId) updateMoveStick(event);
  });
  moveStick.addEventListener('pointerup', event => {
    if (event.pointerId === activePointerId) releaseMoveStick();
  });
  moveStick.addEventListener('pointercancel', releaseMoveStick);

  function bootGame(characterKey) {
    menu.classList.add('hidden');
    gameOver.classList.add('hidden');
    if (!game) {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game-frame',
        width: 960,
        height: 720,
        backgroundColor: '#f4ede5',
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: []
      });
      game.events.once(Phaser.Core.Events.READY, () => game.scene.add('GameScene', window.GameScene, true, { characterKey }));
      return;
    }
    game.scene.start('GameScene', { characterKey });
  }

  startButton.addEventListener('click', () => selectedCharacter && bootGame(selectedCharacter));
  restartButton.addEventListener('click', () => selectedCharacter && bootGame(selectedCharacter));
  window.addEventListener('keydown', event => {
    if (event.key === 'Enter' && selectedCharacter && !menu.classList.contains('hidden')) bootGame(selectedCharacter);
  });
}());
