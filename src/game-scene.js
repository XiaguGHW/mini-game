(function () {
  const Data = window.GameData;

  class GameScene extends Phaser.Scene {
    constructor() {
      super({ key: 'GameScene' });
      this.characterKey = 'strawberry';
      this.running = false;
    }

    preload() {
      ['right', 'up', 'down'].forEach(direction => {
        [1, 2, 3].forEach(frame => {
          this.load.image(
            `strawberry-${direction}-${frame}`,
            `assets/characters/strawberry/strawberry-${direction}-${frame}.png`
          );
        });
      });
      Data.enemies.forEach(enemy => {
        this.load.image(`enemy-art-${enemy.key}`, `assets/characters/enemies/${enemy.key}.png`);
      });
    }

    createTextures() {
      const makeCircleTexture = (key, color, radius, outline) => {
        if (this.textures.exists(key)) return;
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        if (outline) graphics.fillStyle(outline, 1).fillCircle(radius + 2, radius + 2, radius + 2);
        graphics.fillStyle(color, 1).fillCircle(radius + 2, radius + 2, radius);
        graphics.fillStyle(0xffffff, 0.3).fillCircle(radius * 0.63 + 2, radius * 0.63 + 2, Math.max(2, radius * 0.24));
        graphics.generateTexture(key, radius * 2 + 4, radius * 2 + 4);
        graphics.destroy();
      };

      Object.entries(Data.characters).forEach(([key, character]) => makeCircleTexture(`player-${key}`, character.color, 24, 0xffffff));
      makeCircleTexture('xp-orb', 0xf6c85a, 7, 0xffffff);
      makeCircleTexture('spark', 0xffffff, 3, 0);

      if (!this.textures.exists('ground')) {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xf4ede5, 1).fillRect(0, 0, 80, 80);
        graphics.fillStyle(0xece2d8, 1).fillRect(0, 0, 40, 40).fillRect(40, 40, 40, 40);
        graphics.lineStyle(1, 0xffffff, 0.2).strokeRect(0, 0, 80, 80);
        graphics.generateTexture('ground', 80, 80);
        graphics.destroy();
      }
    }

    createStrawberryAnimations() {
      ['right', 'up', 'down'].forEach(direction => {
        const key = `strawberry-walk-${direction}`;
        if (this.anims.exists(key)) return;
        this.anims.create({
          key,
          frames: [1, 2, 3, 2].map(frame => ({ key: `strawberry-${direction}-${frame}` })),
          frameRate: 9,
          repeat: -1
        });
      });
    }

    create(data) {
      this.characterKey = data.characterKey || this.characterKey;
      this.createTextures();
      this.createStrawberryAnimations();
      this.physics.world.setBounds(0, 0, Data.world.width, Data.world.height);
      this.add.tileSprite(0, 0, Data.world.width, Data.world.height, 'ground').setOrigin(0);

      this.enemies = this.physics.add.group();
      this.bullets = this.physics.add.group();
      this.xpOrbs = this.add.group();
      this.stats = this.newStats();
      this.lastFireAt = 0;
      this.lastDamageAt = -Infinity;
      this.spawnAccumulator = 0;
      this.running = true;

      const strawberry = this.characterKey === 'strawberry';
      this.strawberryDirection = 'down';
      this.player = this.physics.add.sprite(
        Data.world.width / 2,
        Data.world.height / 2,
        strawberry ? 'strawberry-down-2' : `player-${this.characterKey}`
      );
      if (strawberry) this.player.setDisplaySize(96, 96).setCircle(60, 68, 60);
      else this.player.setCircle(21, 3, 3);
      this.player.setCollideWorldBounds(true).setDepth(3);
      this.player.setData('baseScale', this.player.scaleX);
      this.cameras.main.startFollow(this.player, true, 1, 1);
      this.cameras.main.setBounds(0, 0, Data.world.width, Data.world.height);
      this.cameras.main.setBackgroundColor('#f4ede5');

      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
      this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, undefined, this);
      this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
      this.publishHud();
    }

    newStats() {
      const character = Data.characters[this.characterKey];
      return {
        level: 1,
        xp: 0,
        xpNeeded: Data.player.xpPerLevel,
        attack: character.damage,
        maxHp: Data.player.maxHp,
        hp: Data.player.maxHp,
        score: 0,
        kills: 0,
        bulletMultiplier: 1,
        fireDelay: Data.player.fireDelay - (character.fireRateBonus || 0)
      };
    }

    update(time, delta) {
      if (!this.running) return;
      this.movePlayer();
      this.moveEnemies(delta);
      this.updateBullets(time);
      this.updateXpOrbs(delta);
      this.tryFire(time);
      this.spawnAccumulator += delta;
      const spawnDelay = Math.max(280, 920 - this.stats.level * 32);
      if (this.spawnAccumulator >= spawnDelay) {
        this.spawnAccumulator = 0;
        this.spawnWave();
      }
    }

    movePlayer() {
      let x = window.GameInput.x;
      let y = window.GameInput.y;
      if (this.cursors.left.isDown || this.wasd.left.isDown) x -= 1;
      if (this.cursors.right.isDown || this.wasd.right.isDown) x += 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) y -= 1;
      if (this.cursors.down.isDown || this.wasd.down.isDown) y += 1;
      const direction = new Phaser.Math.Vector2(x, y).normalize().scale(Data.player.speed);
      this.player.setVelocity(direction.x, direction.y);
      const moving = x !== 0 || y !== 0;
      if (this.characterKey !== 'strawberry') {
        this.player.setRotation(moving ? Phaser.Math.Angle.Between(0, 0, x, y) * 0.06 : 0);
        return;
      }

      this.player.setRotation(0);
      if (moving) {
        if (Math.abs(x) > Math.abs(y)) this.strawberryDirection = x < 0 ? 'left' : 'right';
        else this.strawberryDirection = y < 0 ? 'up' : 'down';
        const animationDirection = this.strawberryDirection === 'left' ? 'right' : this.strawberryDirection;
        this.player.setFlipX(this.strawberryDirection === 'left');
        this.player.play(`strawberry-walk-${animationDirection}`, true);
      } else {
        this.player.stop();
        const idleDirection = this.strawberryDirection === 'left' ? 'right' : this.strawberryDirection;
        this.player.setTexture(`strawberry-${idleDirection}-2`).setFlipX(this.strawberryDirection === 'left');
      }
    }

    moveEnemies(delta) {
      this.enemies.getChildren().forEach(enemy => {
        if (!enemy.active) return;
        const type = enemy.getData('type');
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        if (distance > Data.performance.enemyDespawnDistance) {
          this.removeEnemy(enemy);
          return;
        }
        this.physics.moveToObject(enemy, this.player, type.speed);
        this.drawEnemyHealthBar(enemy);
      });
    }

    tryFire(time) {
      if (time - this.lastFireAt < this.stats.fireDelay) return;
      const target = this.closestEnemy();
      if (!target) return;
      this.lastFireAt = time;
      const character = Data.characters[this.characterKey];
      const bullet = this.bullets.create(this.player.x, this.player.y, 'spark');
      const radius = character.bulletSize * this.stats.bulletMultiplier;
      bullet.setDisplaySize(radius * 2, radius * 2).setTint(character.accent).setDepth(2);
      bullet.setData({ expiresAt: time + 1450, damage: this.stats.attack, target });
      this.physics.moveToObject(bullet, target, Data.player.bulletSpeed);
      const baseScale = this.player.getData('baseScale');
      this.tweens.add({ targets: this.player, scaleX: baseScale * 0.91, scaleY: baseScale * 1.09, duration: 45, yoyo: true, ease: 'Sine.out' });
    }

    closestEnemy() {
      let nearest = null;
      let distance = Infinity;
      this.enemies.getChildren().forEach(enemy => {
        if (!enemy.active) return;
        const current = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        if (current < distance) { distance = current; nearest = enemy; }
      });
      return nearest;
    }

    updateBullets(time) {
      this.bullets.getChildren().forEach(bullet => {
        if (!bullet.active) return;
        if (bullet.getData('expiresAt') <= time) {
          bullet.destroy();
          return;
        }
        const target = bullet.getData('target');
        if (!target?.active) {
          bullet.destroy();
          return;
        }
        this.physics.moveToObject(bullet, target, Data.player.bulletSpeed);
        const reach = target.getData('hitRadius') + bullet.displayWidth * 0.5;
        if (Phaser.Math.Distance.Between(bullet.x, bullet.y, target.x, target.y) <= reach) this.handleBulletHit(bullet, target);
      });
    }

    spawnWave() {
      const available = this.getEnemyLimit() - this.activeEnemyCount();
      if (available <= 0) return;
      const count = Math.min(available, 1 + Math.floor((this.stats.level - 1) / 3));
      for (let index = 0; index < count; index += 1) {
        this.time.delayedCall(index * 75, () => {
          if (this.running) this.spawnEnemy(this.stats.level >= 5 && Math.random() < 0.12);
        });
      }
    }

    spawnEnemy(isElite) {
      if (this.activeEnemyCount() >= this.getEnemyLimit()) return;
      const type = this.pickEnemyType();
      const camera = this.cameras.main.worldView;
      const margin = 75;
      const side = Phaser.Math.Between(0, 3);
      let x;
      let y;
      if (side === 0) { x = Phaser.Math.Between(camera.left, camera.right); y = camera.top - margin; }
      if (side === 1) { x = camera.right + margin; y = Phaser.Math.Between(camera.top, camera.bottom); }
      if (side === 2) { x = Phaser.Math.Between(camera.left, camera.right); y = camera.bottom + margin; }
      if (side === 3) { x = camera.left - margin; y = Phaser.Math.Between(camera.top, camera.bottom); }
      const levelHp = type.hp + Math.floor((this.stats.level - 1) / 4);
      const eliteMultiplier = isElite ? 1.6 : 1;
      const enemy = this.enemies.create(x, y, `enemy-art-${type.key}`);
      const visualSize = type.radius * 2 + 28;
      const visualMultiplier = isElite ? 1.25 : 1;
      const colliderRadius = Math.round((type.radius - 2) * 192 / visualSize);
      const colliderOffset = 96 - colliderRadius;
      enemy.setDisplaySize(visualSize * visualMultiplier, visualSize * visualMultiplier)
        .setCircle(colliderRadius, colliderOffset, colliderOffset)
        .setDepth(2)
        .setAngle(-3);
      const baseScale = enemy.scaleX;
      const maxHp = Math.ceil(levelHp * eliteMultiplier);
      const healthBar = this.add.graphics().setDepth(4);
      enemy.setData({
        type: { ...type, speed: type.speed * (isElite ? 1.15 : 1), score: Math.round(type.score * eliteMultiplier) },
        hp: maxHp,
        maxHp,
        hitRadius: type.radius * visualMultiplier,
        elite: isElite,
        baseScale,
        healthBar,
        healthVisibleUntil: 0
      });
      if (isElite) enemy.setTint(0xffd166);
      this.tweens.add({ targets: enemy, scaleX: baseScale * 1.045, scaleY: baseScale * 0.965, angle: 3, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.drawEnemyHealthBar(enemy);
    }

    activeEnemyCount() {
      return this.enemies.getChildren().reduce((count, enemy) => count + Number(enemy.active), 0);
    }

    getEnemyLimit() {
      const levelBonus = (this.stats.level - 1) * Data.performance.enemyCapPerLevel;
      return Math.min(Data.performance.maxActiveEnemies, Data.performance.baseActiveEnemies + levelBonus);
    }

    pickEnemyType() {
      const total = Data.enemies.reduce((sum, enemy) => sum + enemy.weight, 0);
      let needle = Phaser.Math.Between(1, total);
      for (const enemy of Data.enemies) {
        needle -= enemy.weight;
        if (needle <= 0) return enemy;
      }
      return Data.enemies[0];
    }

    handleBulletHit(bullet, enemy) {
      if (!bullet.active || !enemy.active) return;
      bullet.destroy();
      const currentHp = Number(enemy.getData('hp')) || 0;
      const damage = Number(bullet.getData('damage')) || 1;
      const hp = Math.max(0, currentHp - damage);
      enemy.setData('hp', hp).setData('healthVisibleUntil', this.time.now + Data.performance.healthBarDuration).setTintFill(0xffffff);
      this.time.delayedCall(65, () => {
        if (!enemy.active) return;
        if (enemy.getData('elite')) enemy.setTint(0xffd166);
        else enemy.clearTint();
      });
      const baseScale = enemy.getData('baseScale');
      this.tweens.add({ targets: enemy, scaleX: baseScale * 0.78, scaleY: baseScale * 0.78, duration: 50, yoyo: true, ease: 'Quad.out' });
      this.drawEnemyHealthBar(enemy);
      this.createBurst(enemy.x, enemy.y, enemy.getData('type').color, 6);
      if (hp <= 0) this.killEnemy(enemy);
    }

    drawEnemyHealthBar(enemy) {
      const healthBar = enemy.getData('healthBar');
      if (!healthBar || !enemy.active) return;
      const nearPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) <= Data.performance.healthBarRange;
      const recentlyHit = this.time.now < enemy.getData('healthVisibleUntil');
      healthBar.setVisible(nearPlayer || recentlyHit);
      if (!nearPlayer && !recentlyHit) return;
      const maxHp = Number(enemy.getData('maxHp')) || 1;
      const hp = Number(enemy.getData('hp')) || 0;
      const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
      const width = Math.max(34, enemy.displayWidth * 0.76);
      const height = 6;
      const x = enemy.x - width * 0.5;
      const y = enemy.y - enemy.displayHeight * 0.62;
      healthBar.clear();
      healthBar.fillStyle(0xffffff, 0.92).fillRoundedRect(x - 1, y - 1, width + 2, height + 2, 4);
      healthBar.fillStyle(0x705c5d, 0.8).fillRoundedRect(x, y, width, height, 3);
      if (ratio > 0) healthBar.fillStyle(0xd7747e, 1).fillRoundedRect(x + 1, y + 1, Math.max(2, (width - 2) * ratio), height - 2, 2);
    }

    killEnemy(enemy) {
      if (!enemy.active) return;
      const type = enemy.getData('type');
      this.stats.kills += 1;
      this.stats.score += type.score;
      this.createBurst(enemy.x, enemy.y, type.color, 14);
      this.dropXp(enemy.x, enemy.y, Math.max(1, Math.ceil(type.score / 10)));
      this.tweens.killTweensOf(enemy);
      enemy.getData('healthBar')?.destroy();
      enemy.destroy();
      this.publishHud();
    }

    removeEnemy(enemy) {
      if (!enemy.active) return;
      this.tweens.killTweensOf(enemy);
      enemy.getData('healthBar')?.destroy();
      enemy.destroy();
    }

    dropXp(x, y, count) {
      for (let index = 0; index < count; index += 1) {
        const orb = this.add.sprite(x, y, 'xp-orb').setDepth(1);
        const angle = Phaser.Math.FloatBetween(0, Phaser.Math.PI2);
        orb.setData({ value: 5, vx: Math.cos(angle) * Phaser.Math.Between(80, 150), vy: Math.sin(angle) * Phaser.Math.Between(80, 150) });
        this.xpOrbs.add(orb);
      }
    }

    updateXpOrbs(delta) {
      const dt = delta / 1000;
      this.xpOrbs.getChildren().forEach(orb => {
        if (!orb.active) return;
        const dx = this.player.x - orb.x;
        const dy = this.player.y - orb.y;
        const distance = Math.hypot(dx, dy);
        let vx = orb.getData('vx') * 0.9;
        let vy = orb.getData('vy') * 0.9;
        if (distance < 180 && distance > 0) {
          const pull = Phaser.Math.Linear(80, 1100, 1 - distance / 180);
          vx = (dx / distance) * pull;
          vy = (dy / distance) * pull;
        }
        orb.setData({ vx, vy }).setPosition(orb.x + vx * dt, orb.y + vy * dt);
        if (distance < 30) {
          const value = orb.getData('value');
          orb.destroy();
          this.gainXp(value);
        }
      });
    }

    gainXp(amount) {
      this.stats.xp += amount;
      while (this.stats.xp >= this.stats.xpNeeded) {
        this.stats.xp -= this.stats.xpNeeded;
        this.levelUp();
      }
      this.publishHud();
    }

    levelUp() {
      this.stats.level += 1;
      this.stats.attack += 1;
      this.stats.maxHp += 1;
      this.stats.hp = this.stats.maxHp;
      this.stats.bulletMultiplier += 0.08;
      this.stats.fireDelay = Math.max(110, this.stats.fireDelay - 6);
      this.cameras.main.flash(150, 255, 239, 181, false);
      this.cameras.main.shake(90, 0.003);
      const baseScale = this.player.getData('baseScale');
      this.tweens.add({ targets: this.player, scaleX: baseScale * 1.35, scaleY: baseScale * 1.35, duration: 130, yoyo: true, ease: 'Back.out' });
    }

    handlePlayerHit(player, enemy) {
      if (!this.running || this.time.now - this.lastDamageAt < Data.player.invulnerability) return;
      this.lastDamageAt = this.time.now;
      this.stats.hp -= 1;
      this.cameras.main.shake(110, 0.008);
      this.tweens.add({ targets: this.player, alpha: 0.25, duration: 80, yoyo: true, repeat: 3 });
      this.createBurst(player.x, player.y, 0xd75a6d, 8);
      this.publishHud();
      if (this.stats.hp <= 0) this.finishRun();
    }

    createBurst(x, y, color, count) {
      for (let index = 0; index < count; index += 1) {
        const spark = this.add.sprite(x, y, 'spark').setTint(color).setDepth(5);
        const angle = Phaser.Math.FloatBetween(0, Phaser.Math.PI2);
        const length = Phaser.Math.Between(16, 46);
        this.tweens.add({ targets: spark, x: x + Math.cos(angle) * length, y: y + Math.sin(angle) * length, alpha: 0, scale: Phaser.Math.FloatBetween(0.2, 0.7), duration: Phaser.Math.Between(180, 320), ease: 'Quad.out', onComplete: () => spark.destroy() });
      }
    }

    finishRun() {
      this.running = false;
      this.player.setVelocity(0, 0);
      window.GameUI.showGameOver(this.stats);
    }

    publishHud() { window.GameUI.updateHud(this.stats); }

    shutdown() {
      this.tweens.killAll();
      this.enemies?.getChildren().forEach(enemy => enemy.getData('healthBar')?.destroy());
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    }
  }

  window.GameScene = GameScene;
}());
