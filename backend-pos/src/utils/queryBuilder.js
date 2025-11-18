// queryBuilder.js - Helper para construir consultas seguras
class QueryBuilder {
  static buildUpdateQuery(table, updates, whereField, whereValue) {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    for (const [field, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error("No hay campos para actualizar");
    }

    params.push(whereValue);
    const sql = `UPDATE ${table} SET ${fields.join(
      ", "
    )} WHERE ${whereField} = $${paramIndex} RETURNING *`;

    return { sql, params };
  }

  static buildInsertQuery(data, fields) {
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    // Itera solo sobre los campos definidos en 'fields'
    for (const field of fields) {
      values.push(data[field]); // Obtiene el valor del objeto de datos
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
    }

    return { values, placeholders: placeholders.join(", ") };
  }

  static sanitizeSearchTerm(term) {
    if (!term) return null;
    // Escapar caracteres especiales de LIKE
    return `%${term.replace(/[%_]/g, "\\$&")}%`;
  }

  static validateId(id) {
    if (!id || isNaN(id) || parseInt(id) <= 0) {
      throw new Error("ID inválido");
    }
    return parseInt(id);
  }
}

module.exports = QueryBuilder;
