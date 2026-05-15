import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#DD6B20", "#3182CE", "#805AD5", "var(--color-primary)", "var(--color-success)", "#E53E3E", "#F59E0B", "#06B6D4"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 border shadow-lg" style={{ background: "var(--color-card)", borderColor: "var(--color-border)", fontFamily: "var(--font-caption)" }}>
      <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-foreground)" }}>{label}</p>
      <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
        Consommation: <span className="font-medium" style={{ color: "var(--color-foreground)" }}>{payload[0]?.value?.toFixed(1)} L</span>
      </p>
    </div>
  );
};

export default function OilConsumptionChart({ data = [] }) {
  const isEmpty = data.length === 0;
  return (
    <div className="rounded-xl border p-4 md:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-5">
        <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}>
          Consommation Huile par Engin
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>
          Litres d'huile utilisés (toutes sorties)
        </p>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-52 md:h-60 gap-2">
          <span style={{ color: "var(--color-muted-foreground)", fontSize: 13, fontFamily: "var(--font-caption)" }}>
            Aucune sortie d'huile enregistrée
          </span>
        </div>
      ) : (
        <div className="w-full h-52 md:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="engin" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="consommation" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
