export default function get_table_layout(DatabaseConnection, type, input)
{
    const queryString = `
        WITH enums (enumtypid, enumlabels) AS ( SELECT enumtypid, array_agg(enumlabel::text) AS enumlabels FROM pg_enum GROUP BY enumtypid )
        SELECT
            pg_attribute.attname AS name,
            pg_attribute.atttypid AS type_id,
            pg_attribute.atttypmod AS type_mod,
            format_type(pg_attribute.atttypid, pg_attribute.atttypmod) AS type_name,
            pg_attribute.attidentity = 'a' AS flags_IA,
            pg_attribute.attidentity = 'd' AS flags_ID,
            pg_attribute.attnotnull AS flags_NN,
            pg_attribute.atthasdef AS flags_D,
            (pg_attribute.attgenerated = 's') AS flags_G,
            EXISTS( SELECT * FROM pg_constraint WHERE pg_constraint.conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'u' ) AS flags_U,
            EXISTS( SELECT * FROM pg_constraint WHERE pg_constraint.conrelid = pg_class.oid AND pg_attribute.attnum = ANY(pg_constraint.conkey) AND contype = 'p' ) AS flags_PK,
            enums.enumlabels AS enumlabels
        FROM pg_attribute INNER JOIN pg_class ON pg_class.oid = pg_attribute.attrelid LEFT JOIN enums ON enums.enumtypid = pg_attribute.atttypid
        WHERE pg_class.${type == "name" ? "relname" : "oid"} = $1 AND pg_attribute.attnum > 0 AND NOT pg_attribute.attisdropped
        ORDER BY pg_attribute.attnum ASC`;
    return DatabaseConnection.query(queryString, [ input ], { parse: true });
}