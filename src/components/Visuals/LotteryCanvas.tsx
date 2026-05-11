import React, { useRef, useEffect } from 'react';

interface LotteryCanvasProps {
  text: string;
  isRolling: boolean;
  width?: number;
  height?: number;
  mainTitle?: string;
  subTitle?: string;
  slogan?: string;
}

// 文字粒子
interface Particle {
  x: number;
  y: number;
  tx: number; // Target X
  ty: number; // Target Y
  vx: number;
  vy: number;
  color: string;
  scale: number;
  alpha: number;
}

// 烟花火花粒子
interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  life: number;
  size: number;
}

const LotteryCanvas: React.FC<LotteryCanvasProps> = ({
  text,
  isRolling,
  width = 800,
  height = 400,
  mainTitle = '2026',
  subTitle = '新春抽奖盛典',
  slogan = '智引新｜创赢未来'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const fireworksRef = useRef<FireworkSpark[]>([]);
  const animationRef = useRef<number>();

  // 模式判断：当显示文本为 mainTitle 且不在滚动时，视为默认待机模式
  const isDefaultMode = text === mainTitle && !isRolling;

  // 1. 计算目标点 (当 text 或尺寸变化时触发)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // 清空画布用于计算
    ctx.clearRect(0, 0, width, height);

    // 字体配置
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 关键修改：添加中文字体支持，确保中文名字能被正确渲染和提取
    const fontFamily =
      '"Microsoft YaHei", "Heiti SC", "SimHei", "Arial Black", "Arial", sans-serif';

    if (isDefaultMode) {
      // === 默认模式：只提取 mainTitle 的粒子 ===
      ctx.fillStyle = '#FFFFFF'; // 纯白用于提取像素
      // mainTitle 居中偏上
      const fontSize = Math.min(width * 0.25, 180);
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      // 调整位置，留出下方空间给静态文字
      ctx.fillText(mainTitle, width / 2, height * 0.4);
    } else {
      // === 普通/结果模式：提取传入 text 的粒子 ===
      let fontSize = 180;
      // 根据文字长度动态调整大小，防止中文名字过长
      if (text.length > 2) fontSize = 140;
      if (text.length > 4) fontSize = 100;
      if (text.length > 8) fontSize = 70;

      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(text, width / 2, height / 2);
    }

    // 获取像素数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const pixels: { x: number; y: number }[] = [];
    // 采样间隔
    const gap = isDefaultMode ? 6 : 5;

    for (let y = 0; y < height; y += gap) {
      for (let x = 0; x < width; x += gap) {
        const index = (y * width + x) * 4;
        // 只要不透明度大于 128 就认为是有效像素
        if (data[index + 3] > 128) {
          pixels.push({ x, y });
        }
      }
    }

    // 调整粒子数量
    const currentParticles = particlesRef.current;
    const targetCount = pixels.length;

    // 颜色生成器：大幅提亮
    const getRedGoldColor = () => {
      const r = Math.random();
      // 亮金色：色相40-50，饱和度90-100%，亮度60-80% (更亮)
      if (r > 0.6)
        return `hsl(${40 + Math.random() * 10}, ${90 + Math.random() * 10}%, ${60 + Math.random() * 20}%)`;
      // 亮红色：色相350-10，饱和度90-100%，亮度55-75% (更亮)
      if (r > 0.3)
        return `hsl(${350 + Math.random() * 20}, ${90 + Math.random() * 10}%, ${55 + Math.random() * 20}%)`;
      // 高光白金：色相45，饱和度100%，亮度85-95%
      return `hsl(45, 100%, ${85 + Math.random() * 10}%)`;
    };

    if (currentParticles.length < targetCount) {
      const toAdd = targetCount - currentParticles.length;
      for (let i = 0; i < toAdd; i++) {
        currentParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          tx: 0,
          ty: 0,
          vx: 0,
          vy: 0,
          color: isDefaultMode
            ? getRedGoldColor()
            : `hsl(${Math.random() * 360}, 70%, 60%)`,
          scale: Math.random() * 0.8 + 0.5,
          alpha: Math.random() * 0.5 + 0.5
        });
      }
    }

    // 更新目标位置和属性
    for (let i = 0; i < currentParticles.length; i++) {
      const p = currentParticles[i];
      if (i < pixels.length) {
        p.tx = pixels[i].x;
        p.ty = pixels[i].y;
        // 重新分配颜色以符合当前模式
        if (isDefaultMode) {
          p.color = getRedGoldColor();
        }
      } else {
        // 多余粒子归位到中心或随机散开，并隐藏
        p.tx = width / 2 + (Math.random() - 0.5) * 200;
        p.ty = height / 2 + (Math.random() - 0.5) * 200;
        p.alpha = 0;
      }
    }
  }, [text, width, height, isDefaultMode, mainTitle]);

  // 2. 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontFamily =
      '"Microsoft YaHei", "Heiti SC", "SimHei", "Arial Black", "Arial", sans-serif';

    const render = () => {
      // 清除画布
      ctx.clearRect(0, 0, width, height);

      // === 1. 绘制静态大字 subTitle (仅在默认模式下) ===
      if (isDefaultMode) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // 更亮的金色渐变
        const gradient = ctx.createLinearGradient(
          width / 2 - 200,
          0,
          width / 2 + 200,
          0
        );
        gradient.addColorStop(0, '#FEF3C7'); // amber-100
        gradient.addColorStop(0.5, '#FCD34D'); // amber-300
        gradient.addColorStop(1, '#FEF3C7');

        ctx.fillStyle = gradient;
        // 增强发光
        ctx.shadowColor = 'rgba(252, 211, 77, 0.6)';
        ctx.shadowBlur = 20;

        const titleSize = Math.min(width * 0.08, 60);
        ctx.font = `bold ${titleSize}px ${fontFamily}`;

        // 绘制在 mainTitle 下方
        const textY = height * 0.4 + Math.min(width * 0.25, 180) * 0.55;
        ctx.fillText(subTitle, width / 2, textY);

        // === 新增：绘制 Slogan ===
        const sloganSize = titleSize * 0.4; // 比标题小
        ctx.font = `normal ${sloganSize}px ${fontFamily}`;

        // Slogan 颜色稍微淡一点，或者保持金色但减少发光
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FDE68A'; // amber-200

        // 绘制在标题下方
        const sloganY = textY + titleSize * 1.3;
        ctx.fillText(slogan, width / 2, sloganY);

        ctx.restore();
      }

      // === 2. 绘制文字粒子 ===
      const particles = particlesRef.current;
      const len = particles.length;

      // 开启叠加模式以增强亮度 (仅在默认模式下)
      if (isDefaultMode) {
        ctx.globalCompositeOperation = 'lighter';
      }

      for (let i = 0; i < len; i++) {
        const p = particles[i];

        // 如果 alpha 接近 0 且不在滚动模式，跳过绘制
        if (p.alpha < 0.01 && !isRolling) continue;

        if (isRolling) {
          // === 抽奖中模式：螺旋运动 ===
          const time = Date.now() * 0.002;
          const centerX = width / 2;
          const centerY = height / 2;

          // 简单的螺旋算法
          const angle = time + i * 0.05;
          const radius = 150 + Math.sin(time * 3 + i * 0.1) * 50;
          const targetX = centerX + Math.cos(angle) * radius;
          const targetY = centerY + Math.sin(angle) * radius;

          p.x += (targetX - p.x) * 0.2;
          p.y += (targetY - p.y) * 0.2;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.scale * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // === 默认/结果模式：飞向目标点 ===
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;

          // 缓动
          p.x += dx * 0.08;
          p.y += dy * 0.08;

          // 默认模式下添加微小的"呼吸"或"流动"效果，营造空间感
          if (isDefaultMode) {
            const time = Date.now() * 0.003;
            p.x += Math.sin(time + p.y * 0.05) * 0.3;
            p.y += Math.cos(time + p.x * 0.05) * 0.3;
          }

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          // 默认模式下粒子稍微大一点点，增加发光感
          const size = isDefaultMode ? p.scale * 2.5 : p.scale * 2;
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // === 3. 绘制前景烟花 (仅在默认模式下) ===
      if (isDefaultMode) {
        // 随机生成烟花
        if (Math.random() < 0.05) {
          // 5% 概率每帧生成
          const sparkCount = 20 + Math.random() * 20;
          // 在文字区域附近生成
          const cx = width / 2 + (Math.random() - 0.5) * width * 0.6;
          const cy = height * 0.4 + (Math.random() - 0.5) * height * 0.4;
          const colorBase = Math.random() > 0.5 ? 45 : 0; // 金色或红色系

          for (let k = 0; k < sparkCount; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            fireworksRef.current.push({
              x: cx,
              y: cy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              alpha: 1,
              life: 1.0,
              size: Math.random() * 2 + 1,
              color: `hsl(${colorBase + Math.random() * 20}, 100%, ${70 + Math.random() * 20}%)`
            });
          }
        }

        // 更新并绘制烟花粒子
        const sparks = fireworksRef.current;
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.05; // 重力
          s.life -= 0.02;
          s.alpha = s.life;

          if (s.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }

          ctx.fillStyle = s.color;
          ctx.globalAlpha = s.alpha;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 非默认模式清空烟花
        fireworksRef.current = [];
      }

      // 恢复混合模式
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // 绘制抽奖中的中心文字 (覆盖在粒子之上，确保文字清晰可见)
      if (isRolling) {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = '#FFFFFF';
        let fontSize = 150;
        if (text.length > 2) fontSize = 120;
        if (text.length > 4) fontSize = 90;
        if (text.length > 8) fontSize = 60;

        ctx.font = `900 ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRolling, text, width, height, isDefaultMode, subTitle, slogan]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="max-w-full h-auto"
      style={{
        // 调整滤镜：增加亮度，保持对比度
        filter: isDefaultMode
          ? 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5)) contrast(1.2) brightness(1.2)'
          : 'none',
        transform: 'translateY(-5%)'
      }}
    />
  );
};

export default LotteryCanvas;
