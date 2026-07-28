"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import Matter from "matter-js";
import { motion } from "framer-motion";

// Each item's `top`/`left` are only the INITIAL spawn position (% of the jar
// container) — once the physics sim takes over, real gravity/collision decide
// where it actually rests. `size` is a fixed px bounding box; object-contain
// keeps each item's own aspect ratio within that box. Physical properties are
// my own judgment calls translating "what this object is" into density/
// friction/restitution (e.g. the plush is soft & light so it jostles a lot and
// barely bounces; the water bottle is the heaviest so it moves the least and
// settles fastest) — nudge these if the feel is off.
//
// Array order is the back-to-front stacking order (DOM order = z-index, so
// later entries render in front of earlier ones). `fallOrder` is a separate,
// independent sequence — the order items drop into the jar during the entrance
// animation — since which item lands first has nothing to do with which item
// visually sits in front once everything's settled.
//
// Reconstructed from public/references/jar-hero.png (a low-res wireframe
// export, not final assets) — a few background items are genuine guesses
// where the wireframe only shows a sliver (kitty-mirror / bottle placement).
const ITEMS = [
  // skullpanda + handcream sit at the back of the stack (drawn first = z-index
  // lowest); digi sits at the very front. left values put skullpanda on the
  // left, handcream in the middle, digi on the right — fallOrder is ordered
  // to match (left-to-right entrance sweep for this trio).
  { src: "/images/items/skullpanda.png", alt: "Skullpanda blind box charm", top: 70, left: 25, size: 180, rotate: -15, density: 0.0006, friction: 0.6, restitution: 0.15, frictionAir: 0.02, fallOrder: 9, lockRotation: true },
  { src: "/images/items/handcream.png", alt: "L'Occitane hand cream tube", top: 96, left: 50, size: 170, rotate: 75, density: 0.0007, friction: 0.4, restitution: 0.25, frictionAir: 0.015, fallOrder: 10, lockRotation: true, bodyScale: 0.22 },
  { src: "/images/items/kitty-mirror.png", alt: "Hello Kitty stand mirror", top: 74, left: 24, size: 170, rotate: 25, density: 0.001, friction: 0.3, restitution: 0.35, frictionAir: 0.01, fallOrder: 7, lockRotation: true },
  { src: "/images/items/bingsu.png", alt: "Bingsu ice cream cup", top: 66, left: 48, size: 160, rotate: -10, density: 0.0009, friction: 0.4, restitution: 0.2, frictionAir: 0.015, fallOrder: 6 },
  { src: "/images/items/hufflepuff.png", alt: "Hufflepuff patch", top: 60, left: 28, size: 200, rotate: -6, density: 0.0003, friction: 0.7, restitution: 0.1, frictionAir: 0.03, fallOrder: 8 },
  { src: "/images/items/ballet.png", alt: "Ballet shoes", top: 93, left: 78, size: 155, rotate: -8, density: 0.0005, friction: 0.5, restitution: 0.15, frictionAir: 0.02, fallOrder: 0 },
  { src: "/images/items/bottle.png", alt: "Pink water bottle", top: 74, left: 80, size: 185, rotate: 90, density: 0.002, friction: 0.35, restitution: 0.15, frictionAir: 0.008, fallOrder: 4, lockRotation: true },
  { src: "/images/items/chips.png", alt: "Turtle Chips snack bag", top: 82, left: 32, size: 165, rotate: -3, density: 0.0004, friction: 0.5, restitution: 0.2, frictionAir: 0.025, fallOrder: 3 },
  { src: "/images/items/pineapple.png", alt: "Pineapple drink can", top: 85, left: 20, size: 150, rotate: -4, density: 0.0016, friction: 0.25, restitution: 0.3, frictionAir: 0.008, fallOrder: 2 },
  { src: "/images/items/kitty-plush.png", alt: "Hello Kitty plush toy", top: 77, left: 58, size: 220, rotate: -12, density: 0.0006, friction: 0.6, restitution: 0.15, frictionAir: 0.02, fallOrder: 5, lockRotation: true },
  { src: "/images/items/laneige.png", alt: "Laneige lip balm tube", top: 92, left: 44, size: 175, rotate: 70, density: 0.0007, friction: 0.4, restitution: 0.25, frictionAir: 0.015, fallOrder: 1, lockRotation: true, bodyScale: 0.22 },
  { src: "/images/items/digi.png", alt: "Digital camera with beaded strap", top: 88, left: 70, size: 190, rotate: 20, density: 0.0012, friction: 0.4, restitution: 0.2, frictionAir: 0.012, fallOrder: 11, lockRotation: true },
];

// Fraction of the jar container's own box (0-1). Approximates the lower body
// of the hand-drawn glass outline as a few straight wall segments — jar.png is
// a raster illustration with no exposed path data, so this is a deliberate
// simplification, not a pixel-traced match to the drawn curve.
const WALLS = {
  leftX: 0.11,
  rightX: 0.89,
  topY: 0.42,
  floorY: 0.94,
};

const MAX_SPEED = 18; // px/tick — keeps items from tunneling through walls or flinging out
const RUSTLE_RADIUS = 110; // px
const RUSTLE_STRENGTH = 0.009;
const RUSTLE_FOLLOW = 0.00018; // how much the pointer's own velocity gets imparted
const MAX_POINTER_SPEED = 25; // px/tick — caps sudden fast-mouse-move spikes so a quick swipe doesn't fling items out
const BODY_SCALE = 0.36; // fraction of item.size used as the collision hitbox — much smaller than the rendered image so the pile packs down tightly enough to fit under the jar's rim

export default function Jar() {
  const containerRef = useRef(null);
  const itemElRefs = useRef([]);
  const bodiesRef = useRef([]);
  const wallsRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0, active: false });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = Matter.Engine.create();
    engine.gravity.y = 2.6;
    engine.positionIterations = 10;
    engine.velocityIterations = 8;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const wallThickness = 40;
    const makeWalls = (w, h) => [
      // left
      Matter.Bodies.rectangle(w * WALLS.leftX - wallThickness / 2, h * ((WALLS.topY + WALLS.floorY) / 2), wallThickness, h * (WALLS.floorY - WALLS.topY), { isStatic: true }),
      // right
      Matter.Bodies.rectangle(w * WALLS.rightX + wallThickness / 2, h * ((WALLS.topY + WALLS.floorY) / 2), wallThickness, h * (WALLS.floorY - WALLS.topY), { isStatic: true }),
      // floor — flagged so `markLanded` can identify it by property instead of
      // by reference, since resize recreates these bodies from scratch.
      Object.assign(Matter.Bodies.rectangle(w * ((WALLS.leftX + WALLS.rightX) / 2), h * WALLS.floorY + wallThickness / 2, w * (WALLS.rightX - WALLS.leftX) + wallThickness * 2, wallThickness, { isStatic: true }), { isFloor: true }),
    ];

    const walls = makeWalls(width, height);
    wallsRef.current = walls;
    Matter.World.add(engine.world, walls);

    // Spawn items stacked above the jar with guaranteed vertical gaps between
    // them (no two overlap at t=0) — dropping them in lets gravity/collision
    // compact them into a pile naturally, instead of creating bodies already
    // deeply interpenetrating (which made Matter's overlap-resolution launch
    // them clean through the walls on the very first simulation steps).
    // Spawn height is assigned by `fallOrder`, not array position, so drop
    // sequence and back-to-front stacking can be set independently.
    const spawnY = new Array(ITEMS.length);
    let spawnCursor = 40;
    [...ITEMS.keys()].sort((a, b) => ITEMS[a].fallOrder - ITEMS[b].fallOrder).forEach((i) => {
      spawnY[i] = -(spawnCursor + ITEMS[i].size / 2);
      spawnCursor += ITEMS[i].size + 30;
    });
    const targetX = ITEMS.map((item) => (item.left / 100) * width);
    const bodies = ITEMS.map((item, i) => {
      const scale = item.bodyScale ?? BODY_SCALE;
      const body = Matter.Bodies.rectangle(targetX[i], spawnY[i], item.size * scale, item.size * scale, {
        density: item.density,
        friction: item.friction,
        restitution: item.restitution,
        frictionAir: item.frictionAir,
        angle: (item.rotate * Math.PI) / 180,
        chamfer: { radius: item.size * scale * 0.4 },
      });
      body.itemIndex = i;
      // Infinite inertia means collisions can still push the body around, but
      // can no longer torque it — it holds the angle it was created at instead
      // of spinning (which is how the mirror ended up tumbling endlessly).
      if (item.lockRotation) Matter.Body.setInertia(body, Infinity);
      return body;
    });
    bodiesRef.current = bodies;
    Matter.World.add(engine.world, bodies);

    // Every item drops straight down its assigned column (x pinned, see the
    // "landed" clamp in tick) until it actually touches the floor or another
    // already-landed item. Without this, items still mid-air can graze each
    // other and get knocked sideways — usually toward the center — instead of
    // filling left-to-right/right-to-left in a clean sweep per row.
    const landed = new Array(ITEMS.length).fill(false);
    const markLanded = (body, otherBody) => {
      const i = body.itemIndex;
      if (i === undefined || landed[i]) return;
      const isFloor = otherBody.isFloor === true;
      const isLandedItem = otherBody.itemIndex !== undefined && landed[otherBody.itemIndex];
      if (isFloor || isLandedItem) {
        landed[i] = true;
      }
    };
    const onCollisionStart = (event) => {
      for (const pair of event.pairs) {
        markLanded(pair.bodyA, pair.bodyB);
        markLanded(pair.bodyB, pair.bodyA);
      }
    };
    Matter.Events.on(engine, "collisionStart", onCollisionStart);

    let rafId;
    let lastTime = performance.now();

    const tick = (now) => {
      const delta = Math.min(now - lastTime, 33);
      lastTime = now;

      // A thrown error here would otherwise kill the rAF chain for good,
      // silently freezing every item exactly where it was that frame —
      // whichever items hadn't landed yet (usually whichever fall last) would
      // look like they never dropped in. Recover and keep animating instead.
      try {
        Matter.Engine.update(engine, delta);

        for (const body of bodies) {
          const speed = Matter.Vector.magnitude(body.velocity);
          if (speed > MAX_SPEED) {
            const scale = MAX_SPEED / speed;
            Matter.Body.setVelocity(body, { x: body.velocity.x * scale, y: body.velocity.y * scale });
          }
        }

        // Pin still-falling items to their assigned column so the drop reads as
        // a clean left-to-right (then right-to-left) sweep per row instead of
        // items drifting sideways from mid-air contact before they've landed.
        bodies.forEach((body, i) => {
          if (!landed[i]) {
            Matter.Body.setPosition(body, { x: targetX[i], y: body.position.y });
            Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
          }
        });

        // Hard containment: whatever the solver does (fast impacts between big
        // bodies can still push one through a wall on rare frames), no item is
        // ever allowed to render outside the jar's walls. This is a deliberate
        // belt-and-suspenders clamp, not a substitute for the wall bodies above.
        const currentWalls = wallsRef.current;
        const leftBound = currentWalls[0].bounds.max.x;
        const rightBound = currentWalls[1].bounds.min.x;
        const floorBound = currentWalls[2].bounds.min.y;
        bodies.forEach((body, i) => {
          const half = ITEMS[i].size * ((ITEMS[i].bodyScale ?? BODY_SCALE) / 2);
          let { x, y } = body.position;
          let vx = body.velocity.x;
          let vy = body.velocity.y;
          let clamped = false;
          if (x - half < leftBound) { x = leftBound + half; vx = Math.max(vx, 0); clamped = true; }
          if (x + half > rightBound) { x = rightBound - half; vx = Math.min(vx, 0); clamped = true; }
          if (y + half > floorBound) { y = floorBound - half; vy = Math.min(vy, 0); clamped = true; }
          if (clamped) {
            Matter.Body.setPosition(body, { x, y });
            Matter.Body.setVelocity(body, { x: vx, y: vy });
          }
        });

        if (pointerRef.current.active) {
          const { x: px, y: py, prevX, prevY } = pointerRef.current;
          let vx = px - prevX;
          let vy = py - prevY;
          const pointerSpeed = Math.sqrt(vx * vx + vy * vy);
          if (pointerSpeed > MAX_POINTER_SPEED) {
            const scale = MAX_POINTER_SPEED / pointerSpeed;
            vx *= scale;
            vy *= scale;
          }
          for (const body of bodies) {
            const dx = body.position.x - px;
            const dy = body.position.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < RUSTLE_RADIUS) {
              const falloff = 1 - dist / RUSTLE_RADIUS;
              const mass = body.mass;
              Matter.Body.applyForce(body, body.position, {
                x: ((dx / dist) * falloff * RUSTLE_STRENGTH + vx * RUSTLE_FOLLOW) * mass,
                y: ((dy / dist) * falloff * RUSTLE_STRENGTH + vy * RUSTLE_FOLLOW) * mass,
              });
            }
          }
          pointerRef.current.prevX = px;
          pointerRef.current.prevY = py;
        }

        bodies.forEach((body, i) => {
          const el = itemElRefs.current[i];
          if (!el) return;
          const half = ITEMS[i].size / 2;
          el.style.transform = `translate(${body.position.x - half}px, ${body.position.y - half}px) rotate(${body.angle}rad)`;
        });
      } catch (err) {
        console.error("Jar animation frame failed, recovering:", err);
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const updatePointer = (clientX, clientY, active) => {
      const r = container.getBoundingClientRect();
      pointerRef.current.x = clientX - r.left;
      pointerRef.current.y = clientY - r.top;
      if (!pointerRef.current.active) {
        pointerRef.current.prevX = pointerRef.current.x;
        pointerRef.current.prevY = pointerRef.current.y;
      }
      pointerRef.current.active = active;
    };

    const onMouseMove = (e) => updatePointer(e.clientX, e.clientY, true);
    const onMouseLeave = () => { pointerRef.current.active = false; };
    const onTouchMove = (e) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      updatePointer(e.touches[0].clientX, e.touches[0].clientY, true);
    };
    const onTouchEnd = () => { pointerRef.current.active = false; };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);

    const onResize = () => {
      const r = container.getBoundingClientRect();
      Matter.World.remove(engine.world, wallsRef.current);
      const newWalls = makeWalls(r.width, r.height);
      wallsRef.current = newWalls;
      Matter.World.add(engine.world, newWalls);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      resizeObserver.disconnect();
      Matter.Events.off(engine, "collisionStart", onCollisionStart);
      Matter.World.clear(engine.world);
      Matter.Engine.clear(engine);
    };
  }, []);

  return (
    <section
      className="flex flex-col items-center justify-center px-4 text-center"
      style={{ minHeight: "calc(100vh - 5.5rem)" }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-[380px] touch-none overflow-visible"
        style={{ aspectRatio: "1412 / 2200" }}
      >
        <Image
          src="/images/drawings/jar.png"
          alt="Outline illustration of a jar"
          fill
          priority
          className="pointer-events-none object-contain"
        />
        {ITEMS.map((item, i) => (
          <div
            key={item.src}
            ref={(el) => { itemElRefs.current[i] = el; }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: `${item.size}px`, height: `${item.size}px` }}
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={1200}
              height={1280}
              draggable={false}
              className="h-full w-full select-none object-contain"
            />
          </div>
        ))}
      </div>

      {/* Delayed so the jar drawing reads as the first beat (it's already on
          screen the instant this component mounts) before the text slides up
          — by this point the items are well into their physics-driven fall,
          so the two motions read as concurrent rather than the whole hero
          animating in as one simultaneous blob. */}
      <motion.h1
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
        className="mt-10 font-singsong text-[clamp(2.5rem,8vw,5rem)] leading-none text-[#2460A4]"
      >
        AMY WANG&apos;S JAR
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
        className="mt-2 font-roboto text-xl font-light text-gray-500"
      >
        Filled with tasteful design.
      </motion.p>
    </section>
  );
}
