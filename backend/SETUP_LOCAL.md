# Démarrage local

## 1. Démarrer SQL Server

L'instance détectée sur cette machine est `MSI\DATAVIZ` et son service est
`MSSQL$DATAVIZ`. Dans **SQL Server Configuration Manager** ou `services.msc`,
démarrez **SQL Server (DATAVIZ)**. Si SSMS affiche l'erreur 26, le service est
arrêté ou le protocole TCP/IP est désactivé.

Activez aussi TCP/IP dans SQL Server Configuration Manager, puis redémarrez le
service. Pour une instance nommée, SQL Server Browser doit être démarré ou un
port TCP fixe doit être configuré.

## 2. Configurer l'API

```powershell
cd backend
Copy-Item .env.example .env
```

Remplacez `db_password` dans `.env` par le mot de passe réel du compte `sa`.
La base `GestionSeancesSport` doit exister avant de lancer l'API.

## 3. Installer et démarrer

```powershell
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Vérifiez ensuite `http://localhost:8000/health`, puis exécutez :

```powershell
py seed.py
```

Les identifiants de démonstration sont documentés dans [SEED.md](./SEED.md).
