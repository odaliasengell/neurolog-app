-- ================================================================
-- NEUROLOG - COMMIT 1: FIX CRITICAL BUGS
-- ================================================================
-- Corrige los 3 bugs críticos identificados por SonarQube
-- Target: Fiabilidad Rating C → A (0 bugs)

-- ================================================================
-- 1. LIMPIAR OBJETOS EXISTENTES
-- ================================================================

-- Deshabilitar RLS temporalmente
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['daily_logs', 'user_child_relations', 'children', 'profiles', 'categories', 'audit_logs'];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I DISABLE ROW LEVEL SECURITY', table_name);
    END LOOP;
END $$;

-- Eliminar objetos existentes
DROP VIEW IF EXISTS user_accessible_children CASCADE;
DROP VIEW IF EXISTS child_log_statistics CASCADE;
DROP FUNCTION IF EXISTS user_can_access_child(UUID) CASCADE;
DROP FUNCTION IF EXISTS user_can_edit_child(UUID) CASCADE;
DROP FUNCTION IF EXISTS audit_sensitive_access(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS verify_neurolog_setup() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
DROP TRIGGER IF EXISTS set_updated_at_children ON children;
DROP TRIGGER IF EXISTS set_updated_at_daily_logs ON daily_logs;
DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS user_child_relations CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ================================================================
-- 2. CREACIÓN DE TABLAS CON BUGS CORREGIDOS
-- ================================================================

-- TABLA: profiles (con validaciones corregidas)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'parent',
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    last_failed_login TIMESTAMPTZ,
    account_locked_until TIMESTAMPTZ,
    timezone TEXT NOT NULL DEFAULT 'America/Guayaquil',
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- FIX BUG 1: Validación de email corregida
    CONSTRAINT profiles_email_valid CHECK (
        email IS NOT NULL AND 
        email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    -- FIX BUG 2: Validación de rol con valores específicos
    CONSTRAINT profiles_role_valid CHECK (
        role IN ('parent', 'teacher', 'specialist', 'admin')
    ),
    CONSTRAINT profiles_name_length CHECK (length(trim(full_name)) >= 2),
    CONSTRAINT profiles_failed_attempts_positive CHECK (failed_login_attempts >= 0)
);

-- TABLA: categories
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icon TEXT NOT NULL DEFAULT 'circle',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT categories_name_length CHECK (length(trim(name)) >= 2),
    CONSTRAINT categories_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT categories_sort_order_positive CHECK (sort_order >= 0)
);

-- TABLA: children
CREATE TABLE children (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    birth_date DATE,
    diagnosis TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url TEXT,
    emergency_contact JSONB NOT NULL DEFAULT '[]',
    medical_info JSONB NOT NULL DEFAULT '{}',
    educational_info JSONB NOT NULL DEFAULT '{}',
    privacy_settings JSONB NOT NULL DEFAULT '{"share_with_specialists":true,"share_progress_reports":true,"allow_photo_sharing":false,"data_retention_months":36}',
    created_by UUID REFERENCES profiles(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT children_name_length CHECK (length(trim(name)) >= 2),
    CONSTRAINT children_birth_date_not_future CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE),
    CONSTRAINT children_birth_date_reasonable CHECK (birth_date IS NULL OR birth_date >= CURRENT_DATE - INTERVAL '25 years')
);

-- TABLA: user_child_relations
CREATE TABLE user_child_relations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    relationship_type TEXT NOT NULL,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_view BOOLEAN NOT NULL DEFAULT TRUE,
    can_export BOOLEAN NOT NULL DEFAULT FALSE,
    can_invite_others BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by UUID REFERENCES profiles(id) NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    notification_preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT ucr_relationship_type_valid CHECK (
        relationship_type IN ('parent', 'teacher', 'specialist', 'observer', 'family')
    ),
    CONSTRAINT ucr_expires_after_granted CHECK (expires_at IS NULL OR expires_at > granted_at),
    CONSTRAINT ucr_unique_relationship UNIQUE(user_id, child_id, relationship_type)
);

-- TABLA: daily_logs
CREATE TABLE daily_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES categories(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    mood_score INTEGER,
    intensity_level TEXT NOT NULL DEFAULT 'medium',
    logged_by UUID REFERENCES profiles(id) NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    attachments JSONB NOT NULL DEFAULT '[]',
    tags TEXT[] NOT NULL DEFAULT '{}',
    location TEXT,
    weather TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    specialist_notes TEXT,
    parent_feedback TEXT,
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT dl_title_length CHECK (length(trim(title)) >= 2),
    CONSTRAINT dl_content_not_empty CHECK (length(trim(content)) >= 1),
    CONSTRAINT dl_mood_score_range CHECK (mood_score IS NULL OR (mood_score >= 1 AND mood_score <= 10)),
    CONSTRAINT dl_intensity_valid CHECK (intensity_level IN ('low', 'medium', 'high')),
    CONSTRAINT dl_date_not_future CHECK (log_date <= CURRENT_DATE),
    CONSTRAINT dl_follow_up_date_valid CHECK (follow_up_date IS NULL OR follow_up_date >= log_date),
    -- FIX BUG 3: Consistencia en validación de revisión
    CONSTRAINT dl_reviewed_consistency CHECK (
        (reviewed_by IS NULL AND reviewed_at IS NULL) OR 
        (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
    )
);

-- TABLA: audit_logs
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id TEXT,
    user_id UUID REFERENCES profiles(id),
    user_role TEXT,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    risk_level TEXT NOT NULL DEFAULT 'low',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT al_operation_valid CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    CONSTRAINT al_risk_level_valid CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT al_table_name_not_empty CHECK (length(trim(table_name)) >= 1)
);

-- ================================================================
-- 3. ÍNDICES BÁSICOS
-- ================================================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_children_created_by ON children(created_by);
CREATE INDEX idx_relations_user_child ON user_child_relations(user_id, child_id);
CREATE INDEX idx_logs_child_date ON daily_logs(child_id, log_date DESC);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ================================================================
-- 4. FUNCIONES BÁSICAS CORREGIDAS
-- ================================================================

-- Función para actualizar timestamp (sin bugs)
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW IS NULL THEN
        RETURN NULL;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para crear perfil de usuario (manejo de errores mejorado)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_name TEXT;
    user_role TEXT;
BEGIN
    -- Validar que NEW no sea NULL
    IF NEW IS NULL OR NEW.id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Extraer datos de forma segura
    user_email := COALESCE(NEW.email, '');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
    
    -- Validar email
    IF user_email = '' OR NOT (user_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        RAISE EXCEPTION 'Email inválido o vacío: %', user_email;
    END IF;
    
    -- Validar nombre
    IF user_name = '' OR length(trim(user_name)) < 2 THEN
        user_name := split_part(user_email, '@', 1);
    END IF;
    
    -- Validar rol
    IF user_role NOT IN ('parent', 'teacher', 'specialist', 'admin') THEN
        user_role := 'parent';
    END IF;
    
    -- Insertar perfil
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (NEW.id, user_email, user_name, user_role);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log el error pero no fallar la creación del usuario
        RAISE WARNING 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. TRIGGERS
-- ================================================================

CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_children
    BEFORE UPDATE ON children
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at_daily_logs
    BEFORE UPDATE ON daily_logs
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- 6. DATOS INICIALES
-- ================================================================

INSERT INTO categories (name, description, color, icon, sort_order) VALUES
('Comportamiento', 'Registros sobre comportamiento y conducta', '#3B82F6', 'user', 1),
('Emociones', 'Estado emocional y regulación', '#EF4444', 'heart', 2),
('Aprendizaje', 'Progreso académico y educativo', '#10B981', 'book', 3),
('Socialización', 'Interacciones sociales', '#F59E0B', 'users', 4),
('Comunicación', 'Habilidades de comunicación', '#8B5CF6', 'message-circle', 5),
('Motricidad', 'Desarrollo motor fino y grueso', '#06B6D4', 'activity', 6),
('Alimentación', 'Hábitos alimentarios', '#84CC16', 'utensils', 7),
('Sueño', 'Patrones de sueño y descanso', '#6366F1', 'moon', 8),
('Medicina', 'Información médica y tratamientos', '#EC4899', 'pill', 9),
('Otros', 'Otros registros importantes', '#6B7280', 'more-horizontal', 10)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- 7. RLS BÁSICO
-- ================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_child_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "children_own" ON children FOR ALL USING (created_by = auth.uid());
CREATE POLICY "relations_own" ON user_child_relations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "logs_own" ON daily_logs FOR ALL USING (EXISTS (SELECT 1 FROM children WHERE id = daily_logs.child_id AND created_by = auth.uid()));
CREATE POLICY "categories_all" ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ================================================================
-- VERIFICACIÓN FINAL
-- ================================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ BUGS CRÍTICOS CORREGIDOS:';
    RAISE NOTICE '   • Bug 1: Validación de email corregida';
    RAISE NOTICE '   • Bug 2: Validación de roles específica';
    RAISE NOTICE '   • Bug 3: Consistencia en validación de revisión';
    RAISE NOTICE '🎯 Target: Fiabilidad Rating C → A (0 bugs)';
END $$;