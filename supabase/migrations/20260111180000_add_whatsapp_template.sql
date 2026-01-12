ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp_message_template TEXT DEFAULT 'Hola {nombre}, recuerda que tenemos entrenamiento hoy a las {hora}';
