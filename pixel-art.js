(function () {
/* global React */
// ─────────────────────────────────────────────────────────────
// Pixel art primitives.
// Each icon is an 8x8 or 10x10 grid encoded as strings.
// Legend: ' ' = empty, '#' = forest, '.' = moss, 'o' = soft moss
// Renders as crisp <svg><rect/></svg>.
// ─────────────────────────────────────────────────────────────

const PIX_COLORS = {
  '#': 'var(--forest)',
  '.': 'var(--moss)',
  'o': 'var(--moss-soft)',
  'd': 'var(--forest-deep)',
  'l': '#A0C97A',
  'p': '#C7A878',
  'r': '#cf6a5b',
  'b': '#3a3a3a',
  's': '#DFEFD2',
  // ── Idle-garden plant palette (fixed hues so the plants read the same in
  //    light + dark themes; only used by the procedural plants below). ──
  'k': '#3B5E22', // stem / dark leaf
  'm': '#4E7A30', // mid green
  'g': '#6FA84A', // leaf green
  'y': '#F2D45C', // flower centre / dandelion
  'f': '#E59ABF', // petal (pink)
  'v': '#C9A3E0', // petal (lilac)
  'w': '#F7EFE0', // petal (cream) / seed puff
  't': '#6B5436', // soil
  'u': '#8A6A42' // soil highlight
};
function PixelGrid({
  rows,
  scale = 3,
  color,
  style = {},
  className = ''
}) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const rects = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === ' ' || !ch) continue;
      const fill = color || PIX_COLORS[ch] || 'var(--forest)';
      rects.push(React.createElement('rect', {
        key: `${x},${y}`,
        x: x * scale,
        y: y * scale,
        width: scale,
        height: scale,
        fill
      }));
    }
  }
  return React.createElement('svg', {
    width: w * scale,
    height: h * scale,
    viewBox: `0 0 ${w * scale} ${h * scale}`,
    style: {
      display: 'block',
      shapeRendering: 'crispEdges',
      ...style
    },
    className
  }, rects);
}

// Tiny icons (8x8) for the tech stack
const TECH_ICONS = {
  Java: ['   ##   ', '  #..#  ', '  #..#  ', '   ##   ', ' ###### ', '##    ##', ' ###### ', '   ##   '],
  'Spring Boot': ['  ....  ', ' .#..#. ', '.#....#.', '.#....#.', '.#....#.', '.#....#.', ' .#..#. ', '  ....  '],
  JPA: [' .####. ', '#.oooo.#', '#.####.#', '#.oooo.#', '#.####.#', '#.oooo.#', '#......#', ' .####. '],
  Python: [' .####  ', '.#....# ', '.#.##.# ', ' .####  ', '  ####. ', ' #....#.', ' #.##.#.', '  ####. '],
  Flask: ['   ##   ', '   ##   ', '  ####  ', '  #..#  ', ' ##..## ', '##....##', '##....##', ' ###### '],
  Docker: ['        ', '  ####  ', ' ##..## ', '########', '        ', '########', ' ##..## ', '  ####  '],
  Postman: ['        ', '########', '#.#..#.#', '#..##..#', '#.####.#', '#......#', '########', '        '],
  'REST APIs': ['  ##  ##', ' #.    .', ' #.    .', '##      ', '##      ', ' #.    .', ' #.    .', '  ##  ##'],
  'Alpine.js': ['        ', '   ##   ', '  #..#  ', ' #....# ', ' #.##.# ', '##....##', '########', '        '],
  'DaVinci Resolve': ['########', '#.####.#', '########', '#.####.#', '#.####.#', '########', '#.####.#', '########'],
  PostgreSQL: ['  ####  ', ' #....# ', '#.oooo.#', '#.o##o.#', '#.oooo.#', '#......#', ' ##..## ', '   ##   '],
  MySQL: [' .#..#. ', '.#.##.#.', '#.####.#', '#.####.#', '#.####.#', '#.####.#', '.#.##.#.', ' .#..#. '],
  Git: ['   ##   ', '  ####  ', ' ###### ', '##.##.##', '##.##.##', ' ###### ', '  ####  ', '   ##   '],
  GitHub: [' ###### ', '########', '#.####.#', '#.####.#', '########', '########', ' ## ##  ', ' #   #  '],
  Linux: ['   ##   ', '  #bb#  ', '  #ss#  ', '  ####  ', ' ###### ', '########', '##    ##', '##    ##'],
  Thymeleaf: ['       #', '      #.', '     #..', ' #  #...', '##.##...', ' #..#...', '  #..#  ', '   ##   '],
  HTML: ['########', '#......#', '#.####.#', '#......#', '#.####.#', '#......#', '#......#', '########'],
  CSS: ['########', '#......#', '#.####.#', '#......#', '#.####.#', '#......#', '#.####.#', '########'],
  JavaScript: ['########', '##....##', '##.##.##', '##.##.##', '##.##.##', '##....##', '##.####.', '########'],
  Bootstrap: ['########', '##....##', '##.##.##', '##.#..##', '##.##.##', '##.#..##', '##....##', '########'],
  SQL: [' ###### ', '#.oooo.#', '#......#', '#.oooo.#', '#......#', '#.oooo.#', '#......#', ' ###### '],
  Prompting: [' ###### ', '##.##.##', '#......#', '#.####.#', '#......#', '#......#', ' ###### ', '   ##   ']
};
function PixelIcon({
  name,
  scale = 3
}) {
  const rows = TECH_ICONS[name];
  if (!rows) return null;
  return React.createElement(PixelGrid, {
    rows,
    scale
  });
}

// Pixel sprouts & leaves used for corner decorations and dividers
const SPRITES = {
  sprout: ['   ..   ', '  .oo.  ', '   ..   ', '   ##   ', '..####..', ' .####. ', '   ##   ', '   ##   '],
  leafLeft: ['   ..   ', '  ....  ', ' .#..#. ', '.#....#.', ' .#..#. ', '  ....  ', '   #    ', '   #    '],
  tinyLeaf: [' ..  ', '....', ' .. '],
  mushroom: [' .... ', '.rrrr.', 'rrssrr', 'rrssrr', '.pppp.', ' .pp. ']
};

// Pixel divider — leaves + sprouts marching along a baseline
function PixelDivider({
  width = 520
}) {
  const segments = [];
  const itemPx = 28;
  const count = Math.floor(width / itemPx);
  for (let i = 0; i < count; i++) {
    const variant = i % 5;
    let rows;
    if (variant === 0) rows = SPRITES.tinyLeaf;else if (variant === 1) rows = ['  ##  ', '  ##  '];else if (variant === 2) rows = SPRITES.tinyLeaf;else if (variant === 3) rows = ['  ##  ', '  ##  '];else rows = SPRITES.sprout;
    segments.push(React.createElement('div', {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'flex-end'
      }
    }, React.createElement(PixelGrid, {
      rows,
      scale: 2
    })));
  }
  return React.createElement('div', {
    className: 'pixel-divider'
  }, React.createElement('span', {
    className: 'line'
  }), React.createElement('div', {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'flex-end'
    }
  }, segments), React.createElement('span', {
    className: 'line'
  }));
}

// Walking pixel character — a tiny 10x14 traveler with 2 frames
// frame A and frame B (legs swap)
const CHARACTER_FRAMES = [[
// frame A
'   ####   ', '  #ssss#  ', '  #s##s#  ', '  #ssss#  ', '   ####   ', '  ######  ', ' #..##..# ', ' #..##..# ', ' #..##..# ', '  ######  ', '   ####   ', '   #  #   ', '   #  #   ', '  ##  ##  '], [
// frame B (legs forward/back)
'   ####   ', '  #ssss#  ', '  #s##s#  ', '  #ssss#  ', '   ####   ', '  ######  ', ' #..##..# ', ' #..##..# ', ' #..##..# ', '  ######  ', '   ####   ', '  ##  ##  ', '  #    #  ', ' ##    ## ']];
Object.assign(window, {
  PixelGrid,
  PixelIcon,
  PixelDivider,
  TECH_ICONS,
  SPRITES,
  CHARACTER_FRAMES
});
})();
