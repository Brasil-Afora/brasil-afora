const nameKey = (name: string): string =>
  name.trim().toLocaleLowerCase("pt-BR");

/** Preserve every live record; the static selection only fills missing names. */
export const mergeCatalogOpportunities = <
  T extends { id: string; nome: string },
>(
  records: T[],
  selection: T[]
): T[] => {
  const names = new Set(records.map((record) => nameKey(record.nome)));
  const ids = new Set(records.map((record) => record.id));
  return [
    ...records,
    ...selection.filter(
      (record) => !(ids.has(record.id) || names.has(nameKey(record.nome)))
    ),
  ];
};
