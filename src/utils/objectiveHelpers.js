import { parseDimensionObjective, parseObjective, formatObjective, calculateProgress } from './objectiveParser.js';
import { supabase } from '../config/supabase.js';

export const DIMENSIONS_LIST = [
  'Minerai', 'Forage', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '4/6 ENROBÉ', '10/14', '6/10', '0/31,5'
];

export const PERIOD_TYPES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

export const formatPeriodObjective = (obj) => {
  if (!obj) return 'N/A';
  const dim = obj.dimension || obj.dimension_name;
  const per = obj.period_type?.charAt(0).toUpperCase() + obj.period_type?.slice(1);
  return `${formatObjective({value: obj.value, unit: obj.unit})} ${per} (${dim})`;
};

export const upsertObjective = async (objective) => {
  // Fetch dimension_id
  const { data: dimData } = await supabase
    .from('material_dimensions')
    .select('id')
    .eq('name', objective.dimension)
    .single();
  if (!dimData) throw new Error('Dimension not found');

  return await supabase
    .from('objectives')
    .upsert({
      dimension_id: dimData.id,
      period_type: objective.period || 'daily',
      value: objective.value,
      unit: objective.unit,
      active: true
    });
};

export const getObjectivesBySite = async (siteId, period = 'daily') => {
  return await supabase
    .from('objectives')
    .select(`
      *,
      dimension:material_dimensions!inner(name)
    `)
    .eq('site_id', siteId)
    .eq('period_type', period)
    .eq('active', true);
};

export const deleteObjective = async (id) => {
  return await supabase
    .from('objectives')
    .update({ active: false })
    .eq('id', id);
};

// Parse free text like "500 tonne daily 0/4"
export const parseExtendedObjective = (inputStr, defaultPeriod = 'daily') => {
  const parsed = parseDimensionObjective(inputStr);
  if (parsed) {
    parsed.period = defaultPeriod;
    return parsed;
  }
  const totalParsed = parseObjective(inputStr);
  if (totalParsed) {
    return { dimension: 'Total', ...totalParsed, period: defaultPeriod };
  }
  return null;
};

