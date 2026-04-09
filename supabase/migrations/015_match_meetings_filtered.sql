-- Eliminar la versión anterior (3 params) para evitar ambigüedad de overload.
DROP FUNCTION IF EXISTS match_meetings(VECTOR(1536), UUID, INT);

-- Reemplaza match_meetings para aceptar un filtro opcional de IDs permitidos.
-- Cuando se pasa allowed_ids, solo busca entre esos meetings (visibilidad pre-computada).
-- Cuando es NULL, busca en toda la escuela (comportamiento original para leadership).

CREATE OR REPLACE FUNCTION match_meetings(
  query_embedding  VECTOR(1536),
  school_id_filter UUID,
  match_count      INT DEFAULT 5,
  allowed_ids      UUID[] DEFAULT NULL
)
RETURNS TABLE (meeting_id UUID, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.meeting_id,
    1 - (me.embedding <=> query_embedding) AS similarity
  FROM meeting_embeddings me
  JOIN meetings m ON m.id = me.meeting_id
  WHERE m.school_id = school_id_filter
    AND (allowed_ids IS NULL OR me.meeting_id = ANY(allowed_ids))
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
