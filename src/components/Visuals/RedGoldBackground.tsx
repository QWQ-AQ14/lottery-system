import React, { useEffect, useRef } from 'react';

const RedGoldBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameId: number;
    let tick = 0;

    // === 配置参数 ===
    const VORTEX_PARTICLE_COUNT = 400; // 漩涡粒子数量
    const FIREWORK_CHANCE = 0.02; // 每帧生成烟花的概率
    const RED_PACKET_CHANCE = 0.005; // 每帧生成红包的概率

    // === 粒子类定义 ===

    // 1. 漩涡粒子 (星云效果)
    class VortexParticle {
      angle: number;
      radius: number;
      speed: number;
      size: number;
      color: string;
      opacity: number;

      constructor() {
        this.angle = Math.random() * Math.PI * 2;
        // 分布在不同半径，形成层次感
        this.radius = Math.random() * (Math.max(width, height) * 0.8);
        this.speed =
          (Math.random() * 0.002 + 0.0005) * (Math.random() > 0.5 ? 1 : -1); // 部分逆时针
        this.size = Math.random() * 2 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;

        // 星云配色：金、红、微紫
        const colors = ['#FFD700', '#FF4500', '#DC143C', '#9400D3', '#FFA500'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.angle += this.speed;
        // 简单的脉冲式半径变化，模拟流动
        this.radius += Math.sin(tick * 0.01 + this.angle * 5) * 0.5;
      }

      draw(centerX: number, centerY: number) {
        if (!ctx) return;
        const x = centerX + Math.cos(this.angle) * this.radius;
        const y = centerY + Math.sin(this.angle) * this.radius * 0.6; // 压扁一点形成透视感

        ctx.beginPath();
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // 2. 烟花粒子
    class FireworkParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
      size: number;

      constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.color = color;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // 重力
        this.vx *= 0.95; // 空气阻力
        this.vy *= 0.95;
        this.life -= 0.02;
      }

      draw() {
        if (!ctx || this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    class Firework {
      x: number;
      y: number;
      targetY: number;
      vy: number;
      exploded: boolean;
      particles: FireworkParticle[];
      color: string;
      dead: boolean;

      constructor() {
        this.x = Math.random() * width;
        this.y = height;
        // 修改此处：大幅提高烟花高度
        // 1. targetY: 爆炸目标 Y 坐标。从 height * 0.32 调整为 height * 0.2，让爆炸点更靠近屏幕顶部
        this.targetY = Math.random() * (height * 0.2);
        // 2. vy: 初始上升速度。从 -8~-11 调整为 -12~-16，增加 50% 左右的冲力，确保能飞到更高处
        this.vy = -Math.random() * 4 - 12;

        this.exploded = false;
        this.particles = [];
        this.dead = false;
        this.color = Math.random() > 0.5 ? '#FFD700' : '#FF0000'; // 金或红
      }

      update() {
        if (!this.exploded) {
          this.y += this.vy;
          this.vy *= 0.98;
          if (this.vy > -1 || this.y <= this.targetY) {
            this.explode();
          }
        } else {
          this.particles.forEach((p) => p.update());
          this.particles = this.particles.filter((p) => p.life > 0);
          if (this.particles.length === 0) {
            this.dead = true;
          }
        }
      }

      explode() {
        this.exploded = true;
        for (let i = 0; i < 50; i++) {
          this.particles.push(new FireworkParticle(this.x, this.y, this.color));
        }
      }

      draw() {
        if (!ctx) return;
        if (!this.exploded) {
          // 绘制上升轨迹
          ctx.beginPath();
          ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFF';
          ctx.fill();
        } else {
          this.particles.forEach((p) => p.draw());
        }
      }
    }

    // 3. 红包元素
    class RedPacket {
      x: number;
      y: number;
      rotation: number;
      rotationSpeed: number;
      speedY: number;
      size: number;
      dead: boolean;

      constructor() {
        this.x = Math.random() * width;
        this.y = -50;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.speedY = Math.random() * 2 + 1;
        this.size = Math.random() * 20 + 20; // 20-40px
        this.dead = false;
      }

      update() {
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        if (this.y > height + 50) {
          this.dead = true;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // 绘制红包形状
        ctx.fillStyle = '#D22222'; // 红包红
        ctx.fillRect(
          -this.size / 2,
          -this.size * 0.6,
          this.size,
          this.size * 1.2
        );

        // 绘制金色封口
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(-this.size / 2, -this.size * 0.2);
        ctx.quadraticCurveTo(0, 0, this.size / 2, -this.size * 0.2);
        ctx.lineTo(this.size / 2, -this.size * 0.6);
        ctx.lineTo(-this.size / 2, -this.size * 0.6);
        ctx.fill();

        // 绘制"福"字 (简化为金色方块)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-this.size * 0.15, 0, this.size * 0.3, this.size * 0.3);

        ctx.restore();
      }
    }

    // === 状态管理 ===
    const vortexParticles: VortexParticle[] = [];
    let fireworks: Firework[] = [];
    let redPackets: RedPacket[] = [];

    const init = () => {
      canvas.width = width;
      canvas.height = height;

      vortexParticles.length = 0;
      for (let i = 0; i < VORTEX_PARTICLE_COUNT; i++) {
        vortexParticles.push(new VortexParticle());
      }
    };

    const animate = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      // 移除纯色/渐变背景绘制，使底层的背景图片可见
      // 仅保留粒子效果

      // 2. 绘制漩涡星云
      const centerX = width / 2;
      const centerY = height / 2;

      // 添加发光效果
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FF4500';

      vortexParticles.forEach((p) => {
        p.update();
        p.draw(centerX, centerY);
      });

      ctx.shadowBlur = 0; // 重置

      // 3. 随机生成烟花
      if (Math.random() < FIREWORK_CHANCE) {
        fireworks.push(new Firework());
      }

      fireworks.forEach((fw) => fw.update());
      fireworks = fireworks.filter((fw) => !fw.dead);
      fireworks.forEach((fw) => fw.draw());

      // 4. 随机生成红包
      if (Math.random() < RED_PACKET_CHANCE) {
        redPackets.push(new RedPacket());
      }

      redPackets.forEach((rp) => rp.update());
      redPackets = redPackets.filter((rp) => !rp.dead);
      redPackets.forEach((rp) => rp.draw());

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      init();
    };

    window.addEventListener('resize', handleResize);
    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-0 pointer-events-none"
    />
  );
};

export default RedGoldBackground;
