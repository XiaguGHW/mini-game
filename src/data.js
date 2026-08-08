(function () {
  window.GameData = {
    world: { width: 7200, height: 5400 },
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
      { key: 'donut', color: 0xdf7897, hp: 2, speed: 82, radius: 23, score: 10, weight: 30 },
      { key: 'macaron', color: 0x8ca8d8, hp: 1, speed: 118, radius: 20, score: 8, weight: 25 },
      { key: 'cookie', color: 0xc39a70, hp: 3, speed: 64, radius: 25, score: 15, weight: 20 },
      { key: 'icecream', color: 0xd29ab4, hp: 2, speed: 94, radius: 25, score: 12, weight: 15 },
      { key: 'cupcake', color: 0xc97594, hp: 4, speed: 56, radius: 28, score: 20, weight: 10 }
    ]
  };
}());
