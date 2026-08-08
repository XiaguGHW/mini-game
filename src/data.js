(function () {
  const viewport = { width: 960, height: 720 };
  window.GameData = {
    viewport,
    world: { width: viewport.width * 9, height: viewport.height * 9 },
    performance: {
      baseActiveEnemies: 32,
      enemyCapPerLevel: 2,
      maxActiveEnemies: 54,
      enemyDespawnDistance: 1728,
      healthBarRange: 320,
      healthBarDuration: 900,
      maxBullets: 28,
      maxXpOrbs: 72,
      maxParticles: 110,
      xpMergeDistance: 140
    },
    player: {
      speed: 250,
      maxHp: 3,
      xpPerLevel: 34,
      fireDelay: 280,
      bulletSpeed: 620,
      invulnerability: 850
    },
    characters: {
      strawberry: { name: '草莓', desc: '平衡型 · 小黄种子', icon: '🍓', color: 0xeb6687, accent: 0xf8c950, bulletSize: 10, damage: 1 },
      grape: { name: '葡萄', desc: '射速更快 · 紫色种子', icon: '🍇', color: 0x9364c7, accent: 0xdcc3f2, bulletSize: 8, damage: 1, fireRateBonus: 45 },
      watermelon: { name: '西瓜', desc: '伤害更高 · 黑色种子', icon: '🍉', color: 0xe66a6f, accent: 0x453437, bulletSize: 12, damage: 2 }
    },
    enemies: [
      { key: 'donut', color: 0xdf7897, hp: 3, speed: 84, radius: 23, score: 12, weight: 30 },
      { key: 'macaron', color: 0x8ca8d8, hp: 2, speed: 122, radius: 20, score: 8, weight: 25 },
      { key: 'cookie', color: 0xc39a70, hp: 5, speed: 68, radius: 25, score: 18, weight: 20 },
      { key: 'icecream', color: 0xd29ab4, hp: 3, speed: 96, radius: 25, score: 14, weight: 15 },
      { key: 'cupcake', color: 0xc97594, hp: 6, speed: 58, radius: 28, score: 25, weight: 10 }
    ]
  };
}());
