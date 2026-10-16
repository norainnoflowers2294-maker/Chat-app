import { performance } from 'perf_hooks';

interface Persona {
  id: string;
  name: string;
  display_name?: string;
  updatedAt?: string;
  createdAt?: string;
}

const numPersonas = 10000;
const personas: Persona[] = Array.from({ length: numPersonas }, (_, i) => ({
  id: `p${i}`,
  name: `Persona ${i}`,
  updatedAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
}));

function benchmark(name: string, fn: () => void) {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)} ms`);
}

benchmark('Before Optimization (sort with Date parsing)', () => {
  personas.slice().sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
});

benchmark('After Optimization (map-sort-map)', () => {
  personas.slice()
    .map(p => ({
      p,
      time: new Date(p.updatedAt || p.createdAt || 0).getTime()
    }))
    .sort((a, b) => b.time - a.time)
    .map(wrapper => wrapper.p);
});
