'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface Props {
  months: string[];
  importCounts: number[];
  categories: string[];
  categoryCounts: number[];
}

function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    textColor: style.getPropertyValue('--text-secondary').trim() || (isDark ? '#94a3b8' : '#6c757d'),
    gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    cardBg: style.getPropertyValue('--card-bg-light').trim() || (isDark ? '#0f172a' : '#ffffff'),
  };
}

export default function DashboardCharts({ months, importCounts, categories, categoryCounts }: Props) {
  const importCanvasRef = useRef<HTMLCanvasElement>(null);
  const categoryCanvasRef = useRef<HTMLCanvasElement>(null);
  const importChartRef = useRef<Chart | null>(null);
  const categoryChartRef = useRef<Chart | null>(null);

  function renderCharts() {
    const colors = themeColors();

    if (importCanvasRef.current) {
      importChartRef.current?.destroy();
      const ctx = importCanvasRef.current.getContext('2d')!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 280);
      gradient.addColorStop(0, 'rgba(0, 255, 163, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 255, 163, 0.0)');

      importChartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [{
            label: 'Produits importés',
            data: importCounts,
            borderColor: '#00ffa3',
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00ffa3',
            pointBorderColor: colors.cardBg,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: colors.gridColor }, ticks: { font: { family: 'Inter', size: 11 }, color: colors.textColor } },
            x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: colors.textColor } },
          },
          interaction: { intersect: false, mode: 'index' },
        },
      });
    }

    if (categoryCanvasRef.current) {
      categoryChartRef.current?.destroy();
      const palette = ['#00ffa3', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#6c757d'];
      categoryChartRef.current = new Chart(categoryCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: categories,
          datasets: [{ data: categoryCounts, backgroundColor: palette.slice(0, categories.length), borderColor: colors.cardBg, borderWidth: 3 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, pointStyle: 'circle', font: { family: 'Inter', size: 11 }, color: colors.textColor } },
          },
          cutout: '70%',
        },
      });
    }
  }

  useEffect(() => {
    renderCharts();

    // Recrée les graphiques au changement de thème, comme dans le Twig d'origine
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === 'data-theme') setTimeout(renderCharts, 100);
      });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
      importChartRef.current?.destroy();
      categoryChartRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, importCounts, categories, categoryCounts]);

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="chart-card">
          <div className="card-header-custom">
            <h6><i className="fas fa-chart-area me-2" style={{ color: 'var(--emerald)' }}></i>Activité d&apos;importation</h6>
            <small>Nombre total de produits traités lors des derniers imports</small>
          </div>
          <div className="chart-container">
            <canvas ref={importCanvasRef}></canvas>
          </div>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="chart-card">
          <div className="card-header-custom">
            <h6><i className="fas fa-chart-pie me-2" style={{ color: 'var(--emerald)' }}></i>Répartition Catalogue</h6>
            <small>Part d&apos;articles par catégories actives</small>
          </div>
          <div className="chart-container">
            <canvas ref={categoryCanvasRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}