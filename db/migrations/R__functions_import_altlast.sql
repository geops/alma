create or replace function import_altlast.check_all() returns jsonb as $$
declare
    num_duplicate_translations integer := 0;
begin
    raise notice 'Checking for duplicate code translations';
    select import_altlast.check_duplicate_translations() into strict num_duplicate_translations;

    return jsonb_build_object(
        'num_duplicate_translations', num_duplicate_translations
    );
end;
$$ language plpgsql;


create or replace function import_altlast.check_duplicate_translations() returns integer as $$
declare
    num_rows integer := 0;
begin
    create table if not exists import_altlast.duplicate_translations (
        gruppe_codelisten text not null,
        msgid text not null,
        locale text not null,
        msgstr text not null
    );
    delete from import_altlast.duplicate_translations;

    with codes_stoffgruppe as (
        select c_cli_id, code
        from altlast.cod
        where c_cli_id between 110 and 115
    ), translations_stoffgruppe as (
        select msgid, msgstr, locale, c_cli_id, code
        from altlast.translations
        join codes_stoffgruppe on msgid = 'code.' || c_cli_id || '.' || code
    ), duplicates_same_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_stoffgruppe a
        join translations_stoffgruppe b
            on a.locale = b.locale and a.msgid != b.msgid and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), duplicates_diff_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_stoffgruppe a
        join translations_stoffgruppe b
            on a.code != b.code and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), all_duplicates as (
        select * from duplicates_same_lang
        union
        select * from duplicates_diff_lang
    )
    insert into import_altlast.duplicate_translations (gruppe_codelisten, msgid, locale, msgstr)
    select 'kksg.h_kksg_stoffgrp (110 bis 115)', msgid, locale, msgstr from all_duplicates
    order by lower(msgstr), msgid, locale
    ;

    with codes_stoff as (
        select c_cli_id, code
        from altlast.cod
        where c_cli_id between 301 and 309
    ), translations_stoff as (
        select msgid, msgstr, locale, c_cli_id, code
        from altlast.translations
        join codes_stoff on msgid = 'code.' || c_cli_id || '.' || code
    ), duplicates_same_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_stoff a
        join translations_stoff b
            on a.locale = b.locale and a.msgid != b.msgid and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), duplicates_diff_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_stoff a
        join translations_stoff b
            on a.code != b.code and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), all_duplicates as (
        select * from duplicates_same_lang
        union
        select * from duplicates_diff_lang
    )
    insert into import_altlast.duplicate_translations (gruppe_codelisten, msgid, locale, msgstr)
    select 'stoffe.h_stoffe_stoff (301 bis 309)', msgid, locale, msgstr from all_duplicates
    order by lower(msgstr), msgid, locale
    ;

    with codes_nutzung as (
        select c_cli_id, code
        from altlast.cod
        where c_cli_id in (83, 92, 104)
    ), translations_nutzung as (
        select msgid, msgstr, locale, c_cli_id, code
        from altlast.translations
        join codes_nutzung on msgid = 'code.' || c_cli_id || '.' || code
    ), duplicates_same_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_nutzung a
        join translations_nutzung b
            on a.locale = b.locale and a.msgid != b.msgid and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), duplicates_diff_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_nutzung a
        join translations_nutzung b
            on a.code != b.code and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), all_duplicates as (
        select * from duplicates_same_lang
        union
        select * from duplicates_diff_lang
    )
    insert into import_altlast.duplicate_translations (gruppe_codelisten, msgid, locale, msgstr)
    select 'nubo.h_nubo_akt_nutzung (83, 92, 104)', msgid, locale, msgstr from all_duplicates
    order by lower(msgstr), msgid, locale
    ;

    with codes_schaeden as (
        select c_cli_id, code
        from altlast.cod
        where c_cli_id in (99, 100, 102)
    ), translations_schaeden as (
        select msgid, msgstr, locale, c_cli_id, code
        from altlast.translations
        join codes_schaeden on msgid = 'code.' || c_cli_id || '.' || code
    ), duplicates_same_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_schaeden a
        join translations_schaeden b
            on a.locale = b.locale and a.msgid != b.msgid and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), duplicates_diff_lang as (
        select a.msgid, a.msgstr, a.locale
        from translations_schaeden a
        join translations_schaeden b
            on a.code != b.code and a.c_cli_id != b.c_cli_id and lower(a.msgstr) = lower(b.msgstr)
    ), all_duplicates as (
        select * from duplicates_same_lang
        union
        select * from duplicates_diff_lang
    )
    insert into import_altlast.duplicate_translations (gruppe_codelisten, msgid, locale, msgstr)
    select 'vfus.h_vfus_schaeden (99, 100, 102)', msgid, locale, msgstr from all_duplicates
    order by lower(msgstr), msgid, locale
    ;

    select count(*) from import_altlast.duplicate_translations into strict num_rows;
    raise notice '% duplicate translations written to import_altlast.duplicate_translations', num_rows;
    return num_rows;
end;
$$ language plpgsql;


drop function if exists import_altlast.import_all();

create or replace function import_altlast.import_all(source text default 'demo') returns jsonb as $$
declare
    num_rows_obje integer := 0;
    num_rows_vflz integer := 0;
    num_rows_inta integer := 0;
    num_rows_kksk integer := 0;
    num_rows_kksg integer := 0;
    num_rows_intb integer := 0;
    num_rows_intu integer := 0;
    num_rows_inum integer := 0;
    num_rows_vflgeo integer := 0;
    num_rows_bemgrp integer := 0;
    num_rows_bem integer := 0;
    num_rows_gwnu integer := 0;
    num_rows_gwvk integer := 0;
    num_rows_nubo integer := 0;
    num_rows_ogw integer := 0;
    num_rows_stoffe integer := 0;
    num_rows_veen integer := 0;
    num_rows_vfus integer := 0;
    num_rows_c_cli integer := 0;
    num_rows_cod integer := 0;
    num_rows_cod_kbsinfo integer := 0;
    num_rows_translations integer := 0;
    num_rows_bere integer := 0;
    num_rows_mass integer := 0;
    num_rows_sani integer := 0;
    num_rows_h_gem integer := 0;
    num_rows_kantone integer := 0;
    num_rows_subj integer := 0;
    num_rows_grun integer := 0;
    num_rows_bet integer := 0;
    num_rows_bet_art integer := 0;
    num_rows_adr integer := 0;
    num_rows_kontakt integer := 0;
    num_rows_subj_adr integer := 0;
    num_rows_grun_subj integer := 0;
    num_rows_pool integer := 0;
    num_rows_vfl_pool integer := 0;
    num_rows_subj_category integer := 0;
    num_rows_vflnr integer := 0;
    num_rows_interlis_cod_mapping integer := 0;
    num_rows_interlis_cod_long integer := 0;
    num_rows_interlis_task_mapping integer := 0;
    num_rows_interlis_language_ordering integer := 0;
    num_rows_interlis_oereb_weitere_dokumente integer := 0;
    num_rows_interlis_symbol integer := 0;
    num_rows_wf_node_workflow integer := 0;
    num_rows_wf_node_task integer := 0;
    num_rows_wf_node_document integer := 0;
    num_rows_wf_node_form integer := 0;
    num_rows_wf_node_note integer := 0;
    num_rows_bet_task_task integer := 0;
    num_rows_bet_task_doc integer := 0;
    num_rows_eigentum_without_parcels integer := 0;
    num_rows_task_category integer := 0;
    num_rows_ktu integer := 0;

    bet_result jsonb = '{}'::jsonb;
    wf_node_result jsonb = '{}'::jsonb;
begin
    select import_altlast.import_obje() into num_rows_obje;
    raise notice 'Imported obje: % rows', num_rows_obje;
    select import_altlast.import_vflz() into num_rows_vflz;
    raise notice 'Imported vflz: % rows', num_rows_vflz;

    select import_altlast.import_inta() into num_rows_inta;
    raise notice 'Imported inta: % rows', num_rows_inta;
    select import_altlast.import_kksk() into num_rows_kksk;
    raise notice 'Imported kksk: % rows', num_rows_kksk;
    select import_altlast.import_kksg() into num_rows_kksg;
    raise notice 'Imported kksg: % rows', num_rows_kksg;
    select import_altlast.import_intb() into num_rows_intb;
    raise notice 'Imported intb: % rows', num_rows_intb;
    select import_altlast.import_intu() into num_rows_intu;
    raise notice 'Imported intu: % rows', num_rows_intu;
    select import_altlast.import_inum() into num_rows_inum;
    raise notice 'Imported inum: % rows', num_rows_inum;

    select import_altlast.import_vflgeo() into num_rows_vflgeo;
    raise notice 'Imported vflgeo: % rows', num_rows_vflgeo;

    select import_altlast.import_bem() into num_rows_bem;
    raise notice 'Imported bem: % rows', num_rows_bem;

    select import_altlast.import_gwnu() into num_rows_gwnu;
    raise notice 'Imported gwnu: % rows', num_rows_gwnu;
    select import_altlast.import_gwvk() into num_rows_gwvk;
    raise notice 'Imported gwvk: % rows', num_rows_gwvk;
    select import_altlast.import_nubo() into num_rows_nubo;
    raise notice 'Imported nubo: % rows', num_rows_nubo;
    select import_altlast.import_ogw() into num_rows_ogw;
    raise notice 'Imported ogw: % rows', num_rows_ogw;
    select import_altlast.import_stoffe() into num_rows_stoffe;
    raise notice 'Imported stoffe: % rows', num_rows_stoffe;
    select import_altlast.import_veen() into num_rows_veen;
    raise notice 'Imported veen: % rows', num_rows_veen;
    select import_altlast.import_vfus() into num_rows_vfus;
    raise notice 'Imported vfus: % rows', num_rows_vfus;

    select import_altlast.import_c_cli() into num_rows_c_cli;
    raise notice 'Imported c_cli: % rows', num_rows_c_cli;
    select import_altlast.import_cod() into num_rows_cod;
    raise notice 'Imported cod: % rows', num_rows_cod;
    select import_altlast.import_cod_kbsinfo() into num_rows_cod_kbsinfo;
    raise notice 'Imported cod_kbsinfo: % rows', num_rows_cod_kbsinfo;
    select import_altlast.import_translations() into num_rows_translations;
    raise notice 'Imported translations: % rows', num_rows_translations;

    select import_altlast.import_bere() into num_rows_bere;
    raise notice 'Imported bere: % rows', num_rows_bere;
    select import_altlast.import_mass() into num_rows_mass;
    raise notice 'Imported mass: % rows', num_rows_mass;
    select import_altlast.import_sani() into num_rows_sani;
    raise notice 'Imported sani: % rows', num_rows_sani;

    select import_altlast.import_h_gem() into num_rows_h_gem;
    raise notice 'Imported h_gem: % rows', num_rows_h_gem;

    select import_altlast.import_kantone() into num_rows_kantone;
    raise notice 'Imported kantone: % rows', num_rows_kantone;

    select import_altlast.import_subj() into num_rows_subj;
    raise notice 'Imported subj: % rows', num_rows_subj;
    select import_altlast.import_grun() into num_rows_grun;
    raise notice 'Imported grun: % rows', num_rows_grun;

    select import_altlast.import_bet_bet_art() into bet_result;
    raise notice 'Imported bet: % rows', bet_result->'bet';
    raise notice 'Imported bet_art: % rows', bet_result->'bet_art';
    raise notice 'Assigned dummy parcels to eigentum: % rows', bet_result->'eigentum_without_parcels';

    select import_altlast.import_kontakt() into num_rows_kontakt;
    raise notice 'Imported kontakt: % rows', num_rows_kontakt;

    select import_altlast.import_grun_subj() into num_rows_grun_subj;
    raise notice 'Imported grun_subj: % rows', num_rows_grun_subj;


    select import_altlast.import_pool() into num_rows_pool;
    raise notice 'Imported pool: % rows', num_rows_pool;
    select import_altlast.import_vfl_pool() into num_rows_vfl_pool;
    raise notice 'Imported Vfl pool: % rows', num_rows_vfl_pool;
    select import_altlast.import_subj_category() into num_rows_subj_category;
    raise notice 'Imported Subj catgory: % rows', num_rows_subj_category;

    select import_altlast.import_vflnr() into num_rows_vflnr;
    raise notice 'Import Vflnr: % rows', num_rows_vflnr;

    select import_altlast.import_interlis_cod_mapping() into num_rows_interlis_cod_mapping;
    raise notice 'Imported interlis_cod_mapping: % rows', num_rows_interlis_cod_mapping;
    select import_altlast.import_interlis_cod_long() into num_rows_interlis_cod_long;   
    raise notice 'Imported interlis_cod_long: % rows', num_rows_interlis_cod_long;
    select import_altlast.import_interlis_task_mapping() into num_rows_interlis_task_mapping;   
    raise notice 'Imported interlis_task_mapping: % rows', num_rows_interlis_task_mapping;
    select import_altlast.import_interlis_language_ordering() into num_rows_interlis_language_ordering;   
    raise notice 'Imported interlis_language_ordering: % rows', num_rows_interlis_language_ordering;
    select import_altlast.import_interlis_oereb_weitere_dokumente() into num_rows_interlis_oereb_weitere_dokumente;   
    raise notice 'Imported interlis_oereb_weitere_dokumente: % rows', num_rows_interlis_oereb_weitere_dokumente;
    select import_altlast.import_interlis_symbol() into num_rows_interlis_symbol;   
    raise notice 'Imported interlis_symbol: % rows', num_rows_interlis_symbol;

    select import_altlast.import_wf_node(source) into wf_node_result;
    raise notice 'Imported workflows: % rows', wf_node_result->'workflow';
    raise notice 'Imported tasks: % rows', wf_node_result->'task';
    raise notice 'Imported documents that were manually imported into a4w (doc_uid is null or not in step.step_uid_obj): % rows', wf_node_result->'document_manual_import_a4w';
    raise notice 'Imported documents that are attached to steps: % rows', wf_node_result->'document_attached_to_steps';
    raise notice 'Imported documents that are not attached to steps (doc_uid = WITHOUT): % rows', wf_node_result->'document_not_attached_to_steps';
    raise notice 'Imported documents - empty document steps for docs that were imported manually into a4w: % rows', wf_node_result->'document_empty_steps_manual_import_a4w';
    raise notice 'Imported forms: % rows', wf_node_result->'form';
    raise notice 'Imported bet_tasks: % rows', wf_node_result->'bet_task_task';
    raise notice 'Imported bet_docs: % rows', wf_node_result->'bet_task_doc';
    raise notice 'Imported assets: % rows', wf_node_result->'asset';
    raise notice 'Imported notes: % rows', wf_node_result->'note';

    select import_altlast.import_task_categories() into num_rows_task_category;
    raise notice 'Imported task categories: % rows', num_rows_task_category;
    select import_altlast.import_ktu() into num_rows_ktu;
    raise notice 'Imported ktu: % rows', num_rows_ktu;

    return jsonb_build_object(
        'obje', num_rows_obje,
        'vflz', num_rows_vflz,
        'inta', num_rows_inta,
        'kksk', num_rows_kksk,
        'kksg', num_rows_kksg,
        'intb', num_rows_intb,
        'intu', num_rows_intu,
        'inum', num_rows_inum,
        'vflgeo', num_rows_vflgeo,
        'bemgrp', num_rows_bemgrp,
        'bem', num_rows_bem,
        'gwnu', num_rows_gwnu,
        'gwvk', num_rows_gwvk,
        'nubo', num_rows_nubo,
        'ogw', num_rows_ogw,
        'stoffe', num_rows_stoffe,
        'veen', num_rows_veen,
        'vfus', num_rows_vfus,
        'c_cli', num_rows_c_cli,
        'cod', num_rows_cod,
        'translations', num_rows_translations,
        'bere', num_rows_bere,
        'mass', num_rows_mass,
        'sani', num_rows_sani,
        'h_gem', num_rows_h_gem,
        '_kantone', num_rows_kantone,
        'subj', num_rows_subj,
        'grun', num_rows_grun,
        'bet', bet_result->'bet',
        'bet_art', bet_result->'bet_art',
        'adr', num_rows_adr,
        'kontakt', num_rows_kontakt,
        'subj_adr', num_rows_subj_adr,
        'grun_subj', num_rows_grun_subj,
        'pool', num_rows_pool,
        'vfl_pool', num_rows_vfl_pool,
        'subj_category', num_rows_subj_category,
        'vfl_pool', num_rows_vfl_pool,
        'vflnr', num_rows_vflnr,
        'interlis_cod_mapping', num_rows_interlis_cod_mapping,
        'interlis_cod_long', num_rows_interlis_cod_long,
        'interlis_task_mapping', num_rows_interlis_task_mapping,
        'interlis_language_ordering', num_rows_interlis_language_ordering,
        'interlis_oereb_weitere_dokumente', num_rows_interlis_oereb_weitere_dokumente,
        'interlis_symbol', num_rows_interlis_symbol,
        'ktu', num_rows_ktu,
        'workflow', wf_node_result->'workflow',
        'task', wf_node_result->'task',
        'document', wf_node_result->'document'
    ) || jsonb_build_object(
        -- Split because of 100 argument per function call limit in postgres.
        'form', wf_node_result->'form',
        'asset', wf_node_result->'asset'
    );
end;
$$ language plpgsql;



create or replace function import_altlast.import_obje() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.obje (
        obje_id
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        obje_id
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
    from altlast.obje
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.obje', 'obje_id'),
        (select max(obje_id) from alma.obje)
    );

    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_vflz() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.vflz (
        vflz_id
        , vfl_id
        , obje_id
        , vflz_laufnr
        , vflz_combined_id_kt
        , bezeichnung
        , h_vflz_vftyp
        , c_vflz_vftyp
        , vflz_flurname
        , vflz_strasse
        , vflz_postleitzahl
        , vflz_ort
        , h_gem_id
        , zentroid
        , h_org_kuerzel
        , c_org_kuerzel
        , zeitraum_bis
        , zeitraum_von
        , zeitraum_bisheute
        , zeitraum_bisjahr
        , zeitraum_vonjahr
        , flugplatz_id
        , h_vflz_deponietyp
        , c_vflz_deponietyp
        , in_betrieb
        , nachsorge
        , h_vflz_gws_bereich
        , c_vflz_gws_bereich
        , h_vflz_gws_zone
        , c_vflz_gws_zone
        , h_vflz_durchlaessigkeit
        , c_vflz_durchlaessigkeit
        , h_vflz_karstgeb
        , c_vflz_karstgeb
        , h_vflz_bearbstand
        , c_vflz_bearbstand
        , h_vflz_unterstand
        , c_vflz_unterstand
        , rechtskraft
        , publizieren
        , dat_rechtskraft
        , dat_publizieren
        , lang
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
        , message
        , parent_id
        , vflz_created_date
    )
    select
       vflz.vflz_id
        , vflz.vfl_id
        , vflz.obje_id
        , vflz.vflz_laufnr
        , vflz.vflz_combined_id_kt
        , vflz.bezeichnung
        , vflz.h_vflz_vftyp
        , vflz.c_vflz_vftyp
        , vflz.vflz_flurname
        , vflz.vflz_strasse
        , vflz.vflz_postleitzahl
        , vflz.vflz_ort
        , vflz.h_gem_id
        , ST_SetSRID(
            -- Zentroid is now required, see ALMABASE-345
            ST_MakePoint(
                coalesce(vflz.x_koordinate, ST_X(ST_Centroid(vflgeo.wkb_geometry)), 1)
                , coalesce(vflz.y_koordinate, ST_Y(ST_Centroid(vflgeo.wkb_geometry)), 1)
                , coalesce(vflz.z_koordinate, 0)
            )
            , 2056
        )
        , 26030
        , lower(org.kuerzel)
        , vflz.zeitraum_bis
        , vflz.zeitraum_von
        , vflz.zeitraum_bisheute
        , vflz.zeitraum_bisjahr
        , vflz.zeitraum_vonjahr
        , flugplatz.h_flugplatz_id
        , vflz.h_vflz_deponietyp
        , vflz.c_vflz_deponietyp
        , case
            when vflz.h_vflz_inbetrieb = 78 and vflz.c_vflz_inbetrieb = '01' then true
            when vflz.h_vflz_inbetrieb = 78 and vflz.c_vflz_inbetrieb = '02' then false
            else null
          end
        , case
            when vflz.h_vflz_nachsorge = 78 and vflz.c_vflz_nachsorge = '01' then true
            when vflz.h_vflz_nachsorge = 78 and vflz.c_vflz_nachsorge = '02' then false
            else null
          end
        , vflz.h_vflz_gws_bereich
        , vflz.c_vflz_gws_bereich
        , vflz.h_vflz_gws_zone
        , vflz.c_vflz_gws_zone
        , vflz.h_vflz_durchlaessigkeit
        , vflz.c_vflz_durchlaessigkeit
        , vflz.h_vflz_karstgeb
        , vflz.c_vflz_karstgeb
        , vflz.h_vflz_bearbstand
        , vflz.c_vflz_bearbstand
        , vflz.h_vflz_unterstand
        , vflz.c_vflz_unterstand
        , vflz.rechtskraft
        , vflz.publizieren
        , vflz.dat_rechtskraft
        , vflz.dat_publizieren
        , vflz.lang
        , vflz.erfassungs_datum
        , vflz.erfasser_kuerzel
        , vflz.mutations_datum
        , vflz.mutierer_kuerzel
        , coalesce(hs.is_current, true)
        , coalesce(altlast.t(hs.reason, vflz.lang), '')
        , parent.vflz_id  -- Replace with hs.parent_key_value when workaround is removed (see below)
        , hs.created
    from altlast.vflz
        left join altlast_hist.snapshot hs on vflz.vflz_id = hs.key_value
        -- FIXME This is a workaround for importing the data from the altlast demo instance,
        -- where the vflz table is incomplete. Remove this once this is fixed.
        left join altlast.vflz parent on hs.parent_key_value = parent.vflz_id
        left join altlast.vflgeo on vflz.vflz_id = vflgeo.vflz_id
        left join altlast.org on vflz.owner_org::int = org.org_id
        left join altlast.h_flugplatz flugplatz on vflz.flugplatz = flugplatz.icao
    order by vflz.vflz_id asc
    ;
    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.vflz', 'vflz_id'),
        (select max(vflz_id) from alma.vflz)
    );

    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_inta() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.inta (
        inta_id
        , vflz_id
        , inta_vol_kompartiment
        , inta_ablag_von
        , inta_ablag_bis
        , zeitraum_bisheute
        , zeitraum_bisjahr
        , zeitraum_vonjahr
        , inta_tiefe
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        inta_id
        , vflz_id
        , inta_vol_kompartiment
        , inta_ablag_von
        , inta_ablag_bis
        , zeitraum_bisheute
        , zeitraum_bisjahr
        , zeitraum_vonjahr
        , inta_tiefe
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)

    from altlast.inta
    left join altlast_hist.snapshot hs on inta.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.inta', 'inta_id'),
        (select max(inta_id) from alma.inta)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_kksk() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.kksk (
        kksk_id
        , inta_id
        , kksk_teilvol
        , h_kksk_stoffkl
        , c_kksk_stoffkl
        , h_kksk_infg_ablag_von
        , c_kksk_infg_ablag_von
        , h_kksk_infg_ablag_bis
        , c_kksk_infg_ablag_bis
        , kksk_ablag_von
        , kksk_ablag_bis
        , zeitraum_bisheute
        , zeitraum_bisjahr
        , zeitraum_vonjahr
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        kksk.kksk_id
        , kksk.inta_id
        , kksk.kksk_teilvol
        , kksk.h_kksk_stoffkl
        , kksk.c_kksk_stoffkl
        , kksk.h_kksk_infg_ablag_von
        , kksk.c_kksk_infg_ablag_von
        , kksk.h_kksk_infg_ablag_bis
        , kksk.c_kksk_infg_ablag_bis
        , kksk.kksk_ablag_von
        , kksk.kksk_ablag_bis
        , kksk.zeitraum_bisheute
        , kksk.zeitraum_bisjahr
        , kksk.zeitraum_vonjahr
        , kksk.erfassungs_datum
        , kksk.erfasser_kuerzel
        , kksk.mutations_datum
        , kksk.mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.kksk
    left join altlast.inta using(inta_id)
    left join altlast_hist.snapshot hs on inta.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.kksk', 'kksk_id'),
        (select max(kksk_id) from alma.kksk)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_kksg() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.kksg (
        kksg_id
        , kksk_id
        , kksg_teilvol
        , h_kksg_stoffgrp
        , c_kksg_stoffgrp
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        kksg.kksg_id
        , kksg.kksk_id
        , kksg.kksg_teilvol
        , kksg.h_kksg_stoffgrp
        , kksg.c_kksg_stoffgrp
        , kksg.erfassungs_datum
        , kksg.erfasser_kuerzel
        , kksg.mutations_datum
        , kksg.mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.kksg
    left join altlast.kksk using(kksk_id)
    left join altlast.inta using(inta_id)
    left join altlast_hist.snapshot hs on inta.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.kksg', 'kksg_id'),
        (select max(kksg_id) from alma.kksg)
    );

    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_intb() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.intb (
        intb_id
        , vflz_id
        , intb_typ
        , intb_firma_name
        , intb_firma_strasse
        , intb_firma_plz
        , intb_firma_ort
        , intb_groesse
        , h_intb_bran
        , c_intb_bran
        , intb_vonbetrieb
        , intb_bisbetrieb
        , zeitraum_bisheute
        , zeitraum_bisjahr
        , zeitraum_vonjahr
        , relevant
        , intb_schiessanlage_schusszahl
        , intb_schiessanlage_scheibenzahl
        , intb_schiessanlage_hat_kugelfang
        , h_intb_schiessanlage_typ
        , c_intb_schiessanlage_typ
        , h_intb_infg_vonbetrieb
        , c_intb_infg_vonbetrieb
        , h_intb_infg_bisbetrieb
        , c_intb_infg_bisbetrieb
        , intb_mobile_stoffe
        , h_intb_res_abwbewe
        , c_intb_res_abwbewe
        , zentroid
        , intb_eva
        , h_intb_unterstand
        , c_intb_unterstand
        , h_gem_id
        , h_intb_bran_noga
        , c_intb_bran_noga
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        intb.intb_id
        , intb.vflz_id
        , vflz.c_vflz_vftyp
        , intb.intb_firma_name
        , intb.intb_firma_strasse
        , intb.intb_firma_plz
        , intb.intb_firma_ort
        , intb.intb_groesse
        , intb.h_intb_bran
        , intb.c_intb_bran
        , intb.intb_vonbetrieb
        , intb.intb_bisbetrieb
        , intb.zeitraum_bisheute
        , intb.zeitraum_bisjahr
        , intb.zeitraum_vonjahr
        , intb.relevant
        , intb.intb_schiessanlage_schusszahl
        , intb.intb_schiessanlage_scheibenzahl
        , intb.intb_schiessanlage_hat_kugelfang
        , intb.h_intb_schiessanlage_typ
        , intb.c_intb_schiessanlage_typ
        , intb.h_intb_infg_vonbetrieb
        , intb.c_intb_infg_vonbetrieb
        , intb.h_intb_infg_bisbetrieb
        , intb.c_intb_infg_bisbetrieb
        , intb.intb_mobile_stoffe
        , intb.h_intb_res_abwbewe
        , intb.c_intb_res_abwbewe
        , ST_SetSRID(ST_MakePoint(intb.x_koordinate, intb.y_koordinate), 2056)
        , intb.intb_eva
        , intb.h_intb_unterstand
        , intb.c_intb_unterstand
        , intb.h_gem_id
        , intb.h_intb_bran_noga
        , intb.c_intb_bran_noga
        , intb.erfassungs_datum
        , intb.erfasser_kuerzel
        , intb.mutations_datum
        , intb.mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.intb
    join altlast.vflz using (vflz_id)
    left join altlast_hist.snapshot hs on vflz.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.intb', 'intb_id'),
        (select max(intb_id) from alma.intb)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_intu() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.intu (
        intu_id
        , vflz_id
        , intu_name
        , intu_unfallvon
        , zeitraum_jahr
        , h_intu_infg_unfallvon
        , c_intu_infg_unfallvon
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        intu_id
        , vflz_id
        , intu_name
        , intu_unfallvon
        , zeitraum_jahr
        , h_intu_infg_unfallvon
        , c_intu_infg_unfallvon
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.intu
    left join altlast_hist.snapshot hs on intu.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.intu', 'intu_id'),
        (select max(intu_id) from alma.intu)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_inum() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.inum (
        inum_id
        , intu_id
        , inum_stoffmng
        , inum_ausgelaufen
        , inum_zurueckgewonnen
        , h_inum_stoffe
        , c_inum_stoffe
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        inum.inum_id
        , inum.intu_id
        , inum.inum_stoffmng
        , inum.inum_ausgelaufen
        , inum.inum_zurueckgewonnen
        , inum.h_inum_stoffe
        , inum.c_inum_stoffe
        , inum.erfassungs_datum
        , inum.erfasser_kuerzel
        , inum.mutations_datum
        , inum.mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.inum
    left join altlast.intu using(intu_id)
    left join altlast_hist.snapshot hs on intu.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.inum', 'inum_id'),
        (select max(inum_id) from alma.inum)
    );

    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_vflgeo() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.vflgeo (
        vflgeo_id
        , vflz_id
        , wkb_geometry
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        vflgeo_id
        , vflz_id
        , wkb_geometry
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.vflgeo
    left join altlast_hist.snapshot hs on vflgeo.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.vflgeo', 'vflgeo_id'),
        (select max(vflgeo_id) from alma.vflgeo)
    );

    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_bem() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.bem (
        bem_id
        , bemgrp_id
        , public
        , sort
        , bem
        , key_value
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        bem_id
        , bem.bemgrp_id
        , bem.public
        , bem.sort
        , bem
        , bem.key_value
        , bem.erfassungs_datum
        , bem.erfasser_kuerzel
        , bem.mutations_datum
        , bem.mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.bem
    left join altlast.bemgrp on bem.bemgrp_id = bemgrp.bemgrp_id
    left join altlast.vflz vflz on bem.key_value = vflz.vflz_id and bemgrp.rel_name = 'vflz'
    left join altlast.inta inta on bem.key_value = inta.inta_id and bemgrp.rel_name = 'inta'
    left join altlast.intb intb on bem.key_value = intb.intb_id and bemgrp.rel_name = 'intb'
    left join altlast.intu intu on bem.key_value = intu.intu_id and bemgrp.rel_name = 'intu'
    left join altlast.mass mass on bem.key_value = mass.mass_id and bemgrp.rel_name = 'mass'
    left join altlast.sani sani on bem.key_value = sani.sani_id and bemgrp.rel_name = 'sani'
    left join altlast.pm_cache pm_cache on bem.key_value = pm_cache.pm_cache_id and bemgrp.rel_name = 'pm_cache'
    left join altlast.veen veen on bem.key_value = veen.veen_id and bemgrp.rel_name = 'veen'
    left join altlast.vfus vfus on bem.key_value = vfus.vfus_id and bemgrp.rel_name = 'vfus'
    left join altlast_hist.snapshot hs
        on (
            (bemgrp.rel_name = 'vflz' and vflz.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'inta' and inta.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'intb' and intb.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'intu' and intu.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'mass' and mass.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'sani' and sani.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'pm_cache' and pm_cache.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'veen' and veen.vflz_id = hs.key_value) or
            (bemgrp.rel_name = 'vfus' and vfus.vflz_id = hs.key_value)
        )
    where
        bemgrp.rel_name != 'subj'
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.bem', 'bem_id'),
        (select max(bem_id) from alma.bem)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_gwnu() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.gwnu (
        gwnu_id
        , vflz_id
        , h_gwnu_nutzung
        , c_gwnu_nutzung
        , gwnu_distanz
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        gwnu_id
        , vflz_id
        , h_gwnu_nutzung
        , c_gwnu_nutzung
        , gwnu_distanz
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.gwnu
    left join altlast_hist.snapshot hs on gwnu.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.gwnu', 'gwnu_id'),
        (select max(gwnu_id) from alma.gwnu)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_gwvk() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.gwvk (
        gwvk_id
        , vflz_id
        , h_gwvk_relzugw
        , c_gwvk_relzugw
        , gwvk_flurabstand
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        gwvk_id
        , vflz_id
        , h_gwvk_relzugw
        , c_gwvk_relzugw
        , gwvk_flurabstand
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.gwvk
    left join altlast_hist.snapshot hs on gwvk.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.gwvk', 'gwvk_id'),
        (select max(gwvk_id) from alma.gwvk)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_nubo() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.nubo (
        nubo_id
        , vflz_id
        , h_nubo_nutzungsart
        , c_nubo_nutzungsart
        , h_nubo_akt_nutzung
        , c_nubo_akt_nutzung
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        nubo_id
        , vflz_id
        , h_nubo_nutzungsart
        , c_nubo_nutzungsart
        , h_nubo_akt_nutzung
        , c_nubo_akt_nutzung
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.nubo
    left join altlast_hist.snapshot hs on nubo.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.nubo', 'nubo_id'),
        (select max(nubo_id) from alma.nubo)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_ogw() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.ogw (
        ogw_id
        , vflz_id
        , ogw_name
        , ogw_distanz
        , h_ogw_art_gewaesser
        , c_ogw_art_gewaesser
        , h_ogw_bau_gewaesser
        , c_ogw_bau_gewaesser
        , h_ogw_rellage
        , c_ogw_rellage
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        ogw_id
        , vflz_id
        , ogw_name
        , ogw_distanz
        , h_ogw_art_gewaesser
        , c_ogw_art_gewaesser
        , h_ogw_bau_gewaesser
        , c_ogw_bau_gewaesser
        , h_ogw_rellage
        , c_ogw_rellage
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.ogw
    left join altlast_hist.snapshot hs on ogw.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.ogw', 'ogw_id'),
        (select max(ogw_id) from alma.ogw)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_stoffe() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.stoffe (
        stoffe_id
        , vflz_id
        , h_stoffe_umweltbereich
        , c_stoffe_umweltbereich
        , h_stoffe_gruppe
        , c_stoffe_gruppe
        , h_stoffe_stoff
        , c_stoffe_stoff
        , h_stoffe_beurteilung
        , c_stoffe_beurteilung
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        stoffe_id
        , vflz_id
        , h_stoffe_umweltbereich
        , c_stoffe_umweltbereich
        , h_stoffe_gruppe
        , c_stoffe_gruppe
        , h_stoffe_stoff
        , c_stoffe_stoff
        , h_stoffe_beurteilung
        , c_stoffe_beurteilung
        , now()
        , 'geko'
        , now()
        , 'geko'
        , coalesce(hs.is_current, true)
    from altlast.stoffe
    left join altlast_hist.snapshot hs on stoffe.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.stoffe', 'stoffe_id'),
        (select max(stoffe_id) from alma.stoffe)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_veen() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.veen (
        veen_id
        , vflz_id
        , h_veen_natuerlich
        , c_veen_natuerlich
        , veen_datum
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        veen_id
        , vflz_id
        , h_veen_natuerlich
        , c_veen_natuerlich
        , veen_datum
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.veen
    left join altlast_hist.snapshot hs on veen.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.veen', 'veen_id'),
        (select max(veen_id) from alma.veen)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_vfus() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.vfus (
        vfus_id
        , vflz_id
        , h_vfus_art_schaden
        , c_vfus_art_schaden
        , h_vfus_schaeden
        , c_vfus_schaeden
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        vfus_id
        , vflz_id
        , h_vfus_art_schaden
        , c_vfus_art_schaden
        , h_vfus_schaeden
        , c_vfus_schaeden
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.vfus
    left join altlast_hist.snapshot hs on vfus.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.vfus', 'vfus_id'),
        (select max(vfus_id) from alma.vfus)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_c_cli() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.c_cli (
        c_cli_id
        , c_status
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select distinct
        c_cli_id
        , c_status
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
    from altlast.c_cli
    on conflict (c_cli_id) do nothing
    ;

    -- Split up codeliste 22 (Beziehungsart)
    delete from alma.c_cli where c_cli_id = 22;
    insert into alma.c_cli (c_cli_id, c_status, erfassungs_datum, erfasser)
    values
        (2200, true, current_timestamp, 'geko')
        , (2201, true, current_timestamp, 'geko')
        , (2202, true, current_timestamp, 'geko')
        , (2203, true, current_timestamp, 'geko')
    on conflict (c_cli_id) do nothing
    ;

    -- Create new codeliste 30000 (Task-Typ) and 30001 (Task-Status)
    insert into alma.c_cli (c_cli_id, c_status, erfassungs_datum, erfasser)
    values
        (30000, true, current_timestamp, 'geko')
        , (30001, true, current_timestamp, 'geko')
    on conflict (c_cli_id) do nothing
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.c_cli', 'c_cli_id'),
        (select max(c_cli_id) from alma.c_cli)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_cod() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.cod (
        c_cli_id
        , code
        , sort_key
        , bemerkungen
        , c_status
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select distinct
        case
            when cod.c_cli_id = 22 and cb.eigen then 2200 -- Codeliste Beziehungsart Eigentum
            when cod.c_cli_id = 22 and cod.code = 'sachbearbeitung' then 2202 -- Codeliste Beziehungsart Sachbearbeitung
            when cod.c_cli_id = 22 then 2201 -- Codeliste Beziehungsart Sonstige
            else cod.c_cli_id
        end
        , cod.code
        , cod.sort_key
        , cod.bemerkungen
        , cod.c_status
        , cod.erfassungs_datum
        , cod.erfasser_kuerzel
        , cod.mutations_datum
        , cod.mutierer_kuerzel
    from altlast.cod cod
    left join altlast.cod_bezart cb on (cod.c_cli_id, cod.code) = (cb.c_cli_id_grun_subj, cb.grun_subj)
    on conflict (c_cli_id, code) do nothing
    ;
    get diagnostics num_rows = row_count;

    -- Add initial entry for codelisten Beziehungsart Sachbearbeiter, Geschäfte
    insert into alma.cod (c_cli_id, code, c_status, erfassungs_datum, erfasser)
    values
        (2202, 'sachbearbeitung', true, current_timestamp, 'geko')
        , (2203, 'geschaefte', true, current_timestamp, 'geko')
    on conflict (c_cli_id, code) do nothing
    ;

    -- Add initial entries for codelisten Task-Typ and Task-Status
    insert into alma.cod (c_cli_id, code, c_status, erfassungs_datum, erfasser)
    values
        (30000, 'workflow', true, current_timestamp, 'geko')
        , (30000, 'task', true, current_timestamp, 'geko')
        , (30000, 'form', true, current_timestamp, 'geko')
        , (30000, 'document', true, current_timestamp, 'geko')
        , (30000, 'note', true, current_timestamp, 'geko')
        , (30001, 'started', true, current_timestamp, 'geko')
        , (30001, 'finished', true, current_timestamp, 'geko')
        , (30001, 'skipped', true, current_timestamp, 'geko')
        , (30001, 'inactive', true, current_timestamp, 'geko')
    on conflict (c_cli_id, code) do nothing
    ;

    -- Add beurteilung gruppierung
    insert into alma.c_cli (c_cli_id, c_status, erfassungs_datum, erfasser)
    values
        (1031, true, current_timestamp, 'geko')
    on conflict (c_cli_id) do nothing
    ;
    insert into alma.cod (c_cli_id, code, c_status) values
        (1031, 'sonstige', true)
        , (1031, '01', true)
        , (1031, '02', true)
        , (1031, '03', true)
        , (1031, '04', true)
    on conflict (c_cli_id, code) do nothing
    ;
    update alma.cod set c_is_null_code = true where (c_cli_id = 10017 and code = 'keine') or (c_cli_id = 10018 and code = 'keine');
    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_cod_kbsinfo() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.cod_kbsinfo (
        cod_kbsinfo_id
        , h_bere_res_abwbewe
        , c_bere_res_abwbewe
        , h_bewe_gruppe
        , c_bewe_gruppe
        , color
        , color_rgb
        , belastet
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        row_number() over () as cod_kbsinfo_id
        , ckc.h_bere_res_abwbewe
        , ckc.c_bere_res_abwbewe
        , 1031 as h_bewe_gruppe
        , (case
            when t.msgstr = 'unbelastet' then '01'
            when t.msgstr = 'nicht beurteilt: Vollzug nicht BAV' then '02'
            when t.msgstr = 'nicht beurteilt: Drittstandort' then '02'
            when t.msgstr = 'integriert in anderen Standort' then '02'
            when t.msgstr = 'Informationen ungenügend' then '02'
            when t.msgstr = 'Datensatz gelöscht' then 'sonstige'
            when t.msgstr = 'Belastet, überwachungsbedürftig' then '04'
            when t.msgstr = 'Belastet, weder überwachungs- noch sanierungsbedürftig' then '03'
            when t.msgstr = 'Belastet, Untersuchungsbedürftigkeit noch nicht definiert' then '02'
            when t.msgstr = 'Belastet, untersuchungsbedürftig' then '04'
            when t.msgstr = 'Belastet, sanierungsbedürftig' then '04'
            when t.msgstr = 'Belastet, keine schädlichen oder lästigen Einwirkungen zu erwarten' then '03'
            else 'sonstige'
        end) as c_bewe_gruppe
        , ckc.color
        , ckc.color_rgb
        , cbk.kbs
        , max(ckc.erfassungs_datum)
        , max(ckc.erfasser_kuerzel)
        , max(ckc.mutations_datum)
        , max(ckc.mutierer_kuerzel)
    from altlast.cod_kbscolor ckc
    join altlast.cod_berekbs cbk using(h_bere_res_abwbewe,c_bere_res_abwbewe)
    join altlast.translations t on (t.msgid = 'code.' || ckc.h_bere_res_abwbewe || '.' || ckc.c_bere_res_abwbewe and t.locale = 'de')
    group by ckc.h_bere_res_abwbewe
        , ckc.c_bere_res_abwbewe
        , ckc.color
        , ckc.color_rgb
        , cbk.kbs
        , t.msgstr
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.cod_kbsinfo', 'cod_kbsinfo_id'),
        (select max(cod_kbsinfo_id) from alma.cod_kbsinfo)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_translations() returns integer as $$
declare
    num_rows integer := 0;
begin
    create temporary table code_translations as
    select
        replace(t.msgid, '.', ':') as msgid
        , t.msgstr
        , t.locale
        , t.erfassungs_datum
        , t.erfasser_kuerzel
        , t.mutations_datum
        , t.mutierer_kuerzel
        , case
            when cod.c_cli_id = 22 and cb.eigen then 2200 -- Codeliste Beziehungsart Eigentum
            when cod.c_cli_id = 22 and cod.code = 'sachbearbeitung' then 2202 -- Codeliste Beziehungsart Sachbearbeitung
            when cod.c_cli_id = 22 then 2201 -- Codeliste Beziehungsart Sonstige
            else cod.c_cli_id
          end as c_cli_id
        , cod.code
    from altlast.translations t
    -- Only import translations for codes that actually exist in the cod table.
    join altlast.cod on msgid = 'code.' || cod.c_cli_id::text || '.' || cod.code
    left join altlast.cod_bezart cb on (cod.c_cli_id, cod.code) = (cb.c_cli_id_grun_subj, cb.grun_subj)
    where t.msgid like 'code.%'
    ;

    -- Update msgid for translations of codes from old codeliste 22
    -- to contain the new correct c_cli_id.
    update code_translations
    set msgid = 'code:' || c_cli_id || ':' || code
    where msgid like 'code:22:%';

    -- prefix translation with '<code> - ' for code list 25 (Branchencodes ASW)
    update code_translations
        set msgstr = regexp_replace(msgid, '^code:25:', '') || ' - ' || msgstr
    where msgid like 'code:25:%';

    -- prefix translation with '<code> - ' for code list 250 (Branchencodes NOGA)
    update code_translations
        set msgstr = regexp_replace(msgid, '^code:250:', '') || ' - ' || msgstr
    where msgid like 'code:250:%';

    -- prefix translation with '<code> - ' for code list 25001 (Branchencodes NOGA)
    update code_translations
        set msgstr = regexp_replace(msgid, '^code:25001:', '') || ' - ' || msgstr
    where msgid like 'code:25001:%';

    -- append ' *' to remaining duplicate translations within the same code list
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || ' *'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 2 (for translations that appear 3 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 3 (for translations that appear 4 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 4 (for translations that appear 5 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 5 (for translations that appear 6 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 6 (for translations that appear 7 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 7 (for translations that appear 8 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 8 (for translations that appear 9 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- append '*' to remaining duplicate translations within the same code list
    -- round 9 (for translations that appear 10 times in the same list)
    with duplicate_translations as (
        select b.msgid, b.locale, b.msgstr
        from code_translations a
        join code_translations b on lower(a.msgstr) = lower(b.msgstr) and a.locale = b.locale
        where a.msgid < b.msgid
          and (string_to_array(a.msgid, ':'))[2] = (string_to_array(b.msgid, ':'))[2]
        order by b.msgid
    )
    update code_translations t
    set msgstr = dup.msgstr || '*'
    from duplicate_translations dup
    where t.msgid = dup.msgid and t.locale = dup.locale
    ;

    -- Add translations for initial entry for codeliste Beziehungsart Sachbearbeiter
    insert into code_translations (msgid, msgstr, locale, erfassungs_datum, erfasser_kuerzel)
    values
        ('code:2202:sachbearbeitung', 'Sachbearbeiter', 'de', current_timestamp, 'geko')
        , ('code:2202:sachbearbeitung', 'Personne responsable', 'fr', current_timestamp, 'geko')
        , ('code:2202:sachbearbeitung', 'Responsabile', 'it', current_timestamp, 'geko')
    ;

    -- Add translations for initial entry for codeliste Beziehungsart Geschaefte
    insert into code_translations (msgid, msgstr, locale, erfassungs_datum, erfasser_kuerzel)
    values
        ('code:2203:geschaefte', 'Beteiligung Task', 'de', current_timestamp, 'geko')
        , ('code:2203:geschaefte', 'Participation task', 'fr', current_timestamp, 'geko')
        , ('code:2203:geschaefte', 'Partecipazione compito', 'it', current_timestamp, 'geko')
    ;

    -- Add translations for initial entries of codelisten Task-Typ and Task-Status
    insert into code_translations (msgid, msgstr, locale, erfassungs_datum, erfasser_kuerzel)
    values
        ('code:30000:workflow', 'Prozess', 'de', current_timestamp, 'geko')
        , ('code:30000:workflow', 'process', 'fr', current_timestamp, 'geko')
        , ('code:30000:workflow', 'processo', 'it', current_timestamp, 'geko')
        , ('code:30000:task', 'Aufgabe', 'de', current_timestamp, 'geko')
        , ('code:30000:task', 'tâche', 'fr', current_timestamp, 'geko')
        , ('code:30000:task', 'compito', 'it', current_timestamp, 'geko')
        , ('code:30000:form', 'Formular', 'de', current_timestamp, 'geko')
        , ('code:30000:form', 'formulaire', 'fr', current_timestamp, 'geko')
        , ('code:30000:form', 'forma', 'it', current_timestamp, 'geko')
        , ('code:30000:document', 'Dokument', 'de', current_timestamp, 'geko')
        , ('code:30000:document', 'document', 'fr', current_timestamp, 'geko')
        , ('code:30000:document', 'documento', 'it', current_timestamp, 'geko')
        , ('code:30000:note', 'Notiz', 'de', current_timestamp, 'geko')
        , ('code:30000:note', 'Note', 'fr', current_timestamp, 'geko')
        , ('code:30000:note', 'Nota', 'it', current_timestamp, 'geko')
        , ('code:30001:started', 'offen', 'de', current_timestamp, 'geko')
        , ('code:30001:started', 'ouvert', 'fr', current_timestamp, 'geko')
        , ('code:30001:started', 'aperto', 'it', current_timestamp, 'geko')
        , ('code:30001:finished', 'geschlossen', 'de', current_timestamp, 'geko')
        , ('code:30001:finished', 'fermé', 'fr', current_timestamp, 'geko')
        , ('code:30001:finished', 'chiuso', 'it',  current_timestamp, 'geko')
        , ('code:30001:skipped', 'übersprungen', 'de', current_timestamp, 'geko')
        , ('code:30001:skipped', 'sauté', 'fr', current_timestamp, 'geko')
        , ('code:30001:skipped', 'saltato', 'it', current_timestamp, 'geko')
        , ('code:30001:inactive', 'ruhend', 'de', current_timestamp, 'geko')
        , ('code:30001:inactive', 'en pause', 'fr', current_timestamp, 'geko')
        , ('code:30001:inactive', 'in pausa', 'it', current_timestamp, 'geko')
    ;

    -- Add translations for gruppierung Beurteilung
    insert into code_translations (msgid, msgstr, locale, erfassungs_datum, erfasser_kuerzel) values
        ('code:1031:sonstige', 'Sonstige', 'de', current_timestamp, 'geko')
        , ('code:1031:sonstige', 'Autres', 'fr', current_timestamp, 'geko')
        , ('code:1031:sonstige', 'Altri', 'it', current_timestamp, 'geko')
        , ('code:1031:01', 'Unbelastet', 'de', current_timestamp, 'geko')
        , ('code:1031:01', 'Non pollué', 'fr', current_timestamp, 'geko')
        , ('code:1031:01', 'Non inquinato', 'it', current_timestamp, 'geko')
        , ('code:1031:02', 'Beurteilung ausstehend / Information ungenügend', 'de', current_timestamp, 'geko')
        , ('code:1031:02', 'Évaluation en attente / information insuffisante', 'fr', current_timestamp, 'geko')
        , ('code:1031:02', 'Valutazione in sospeso / informazioni insufficienti', 'it', current_timestamp, 'geko')
        , ('code:1031:03', 'Belastet - ohne Handlungsbedarf', 'de', current_timestamp, 'geko')
        , ('code:1031:03', 'Pollué - sans besoin d''action', 'fr', current_timestamp, 'geko')
        , ('code:1031:03', 'Inquinato - nessun intervento necessario', 'it', current_timestamp, 'geko')
        , ('code:1031:04', 'Belastet - mit Handlungsbedarf', 'de', current_timestamp, 'geko')
        , ('code:1031:04', 'Pollué - avec besoin d''action', 'fr', current_timestamp, 'geko')
        , ('code:1031:04', 'Inquinato - con necessità di intervento', 'it', current_timestamp, 'geko')
    ;

    update code_translations set msgstr = 'Die Vollzugszuständigkeit liegt nicht beim aktuellen Amt' where msgid = 'code:10104:BAV91' and locale = 'de'; -- Ursprungswert: Die Vollzugszuständigkeit liegt nicht beim BAV.
    update code_translations set msgstr = 'La compétence en matière d''exécution n''incombe pas à l''administration actuelle' where msgid = 'code:10104:BAV91' and locale = 'fr';
    update code_translations set msgstr = 'La competenza esecutiva non spetta all''attuale ufficio' where msgid = 'code:10104:BAV91' and locale = 'it';

    update code_translations set msgstr = 'Kein aktueller Handlungsbedarf. Bei Bauvorhaben: Absprache notwendig.' where msgid = 'code:10105:BAV60' and locale = 'de'; -- Ursprungswert: Kein aktueller Handlungsbedarf. Bei Bauvorhaben: Absprache mit BAV notwendig.
    update code_translations set msgstr = 'Pas de besoin d''action actuel. Pour les projets de construction : coordination nécessaire.' where msgid = 'code:10105:BAV60' and locale = 'fr';
    update code_translations set msgstr = 'Nessun intervento attuale necessario. Per progetti di costruzione: coordinamento necessario.' where msgid = 'code:10105:BAV60' and locale = 'it';

    update code_translations set msgstr = 'Durchführung von Arbeiten gemäss Art. 13 AltlV.' where msgid = 'code:10105:BAV71' and locale = 'de'; -- Ursprungswert: Durchführung von Arbeiten gemäss Art. 13 AltlV (in Absprache mit BAV)
    update code_translations set msgstr = 'Mesures prises selon l’art. 13 OSites.' where msgid = 'code:10105:BAV71' and locale = 'fr';
    update code_translations set msgstr = 'Adozione dei provvedimenti previsti dall’art. 13 OSiti.' where msgid = 'code:10105:BAV71' and locale = 'it';

    update code_translations set msgstr = 'Durchführung von Arbeiten gemäss Art. 14ff AltlV.' where msgid = 'code:10105:BAV81' and locale = 'de'; -- Ursprungswert: Durchführung von Arbeiten gemäss Art. 14ff AltlV (in Absprache mit BAV)
    update code_translations set msgstr = 'Mesures prises selon l’art. 14ss OSites.' where msgid = 'code:10105:BAV81' and locale = 'fr';
    update code_translations set msgstr = 'Adozione dei provvedimenti previsti dall’art. 14 segg. OSiti.' where msgid = 'code:10105:BAV81' and locale = 'it';

    update code_translations set msgstr = 'Kein Handlungsbedarf' where msgid = 'code:10105:BAV91' and locale = 'de'; -- Ursprungswert: Kein Handlungsbedarf seitens BAV
    update code_translations set msgstr = 'Aucune mesure nécessaire' where msgid = 'code:10105:BAV91' and locale = 'fr';
    update code_translations set msgstr = 'Nessuna necessità di provvedimenti' where msgid = 'code:10105:BAV91' and locale = 'it';

    update code_translations set msgstr = 'Kein Handlungsbedarf *' where msgid = 'code:10105:BAV92' and locale = 'de'; -- Ursprungswert: Kein Handlungsbedarf seitens BAV *
    update code_translations set msgstr = 'Aucune mesure nécessaire *' where msgid = 'code:10105:BAV92' and locale = 'fr';
    update code_translations set msgstr = 'Nessuna necessità di provvedimenti *' where msgid = 'code:10105:BAV92' and locale = 'it';

    update code_translations set msgstr = 'Kein Handlungsbedarf **' where msgid = 'code:10105:BAV93' and locale = 'de'; -- Ursprungswert: Kein Handlungsbedarf seitens BAV **
    update code_translations set msgstr = 'Aucune mesure nécessaire **' where msgid = 'code:10105:BAV93' and locale = 'fr';
    update code_translations set msgstr = 'Nessuna necessità di provvedimenti **' where msgid = 'code:10105:BAV93' and locale = 'it';

    update code_translations set msgstr = 'nicht beurteilt: Vollzug extern' where msgid = 'code:103:BAV91' and locale = 'de'; -- Ursprungswert: nicht beurteilt: Vollzug nicht BAV
    update code_translations set msgstr = 'non évalué: exécution externe' where msgid = 'code:103:BAV91' and locale = 'fr';
    update code_translations set msgstr = 'non valutato: esecuzione esterna' where msgid = 'code:103:BAV91' and locale = 'it';

    update code_translations set msgstr = 'Beurteilung abgeschlossen' where msgid = 'code:55:BAV_100' and locale = 'de'; -- Ursprungswert: Beurteilung BAV abgeschlossen
    update code_translations set msgstr = 'Évaluation terminée' where msgid = 'code:55:BAV_100' and locale = 'fr';
    update code_translations set msgstr = 'Valutazione chiusa' where msgid = 'code:55:BAV_100' and locale = 'it';

    update code_translations set msgstr = 'Beurteilung in Bearbeitung' where msgid = 'code:55:BAV_101' and locale = 'de'; -- Ursprungswert: Beurteilung BAV in Bearbeitung
    update code_translations set msgstr = 'Évaluation en cours' where msgid = 'code:55:BAV_101' and locale = 'fr';
    update code_translations set msgstr = 'Valutazione in corso' where msgid = 'code:55:BAV_101' and locale = 'it';

    update code_translations set msgstr = 'Nachführung: Beurteilung in Bearbeitung' where msgid = 'code:55:BAV_111' and locale = 'de'; -- Ursprungswert: Nachführung: Beurteilung BAV in Bearbeitung
    update code_translations set msgstr = 'Mise à jour: Évaluation en cours' where msgid = 'code:55:BAV_111' and locale = 'fr';
    update code_translations set msgstr = 'Aggiornamento: Valutazione in corso' where msgid = 'code:55:BAV_111' and locale = 'it';

    update code_translations set msgstr = 'Löschung: Beurteilung in Bearbeitung' where msgid = 'code:55:BAV_112' and locale = 'de'; -- Ursprungswert: Löschung: Beurteilung BAV in Bearbeitung
    update code_translations set msgstr = 'Radiation : évaluation en cours' where msgid = 'code:55:BAV_112' and locale = 'fr';
    update code_translations set msgstr = 'Cancellazione: valutazione in corso' where msgid = 'code:55:BAV_112' and locale = 'it';

    update code_translations set msgstr = 'Mutation: Beurteilung abgeschlossen' where msgid = 'code:55:BAV_115' and locale = 'de'; -- Ursprungswert: Mutation: Beurteilung BAV abgeschlossen
    update code_translations set msgstr = 'Mutation : évaluation terminée' where msgid = 'code:55:BAV_115' and locale = 'fr';
    update code_translations set msgstr = 'Mutazione: valutazione chiusa' where msgid = 'code:55:BAV_115' and locale = 'it';

    -- Ursprungswert: Inhaber hat innerhalb der vorgegebenen Frist nach Eintrag in den Kataster eine Voruntersuchung gemäss Art. 7 AltlV durchzuführen (in Absprache mit dem BAV).
    update code_translations set msgstr = 'Inhaber hat innerhalb der vorgegebenen Frist nach Eintrag in den Kataster eine Voruntersuchung gemäss Art. 7 AltlV durchzuführen.' where msgid = 'code:10105:03' and locale = 'de';
    update code_translations set msgstr = 'Le détenteur doit effectuer après l’inscription au cadastre une investigation préalable selon l’art. 7 OSites.' where msgid = 'code:10105:03' and locale = 'fr';
    update code_translations set msgstr = 'Il titolare deve eseguire un’indagine preliminare ai sensi dell’art. 7 OSiti dopo l’iscrizione nel catasto.' where msgid = 'code:10105:03' and locale = 'it'; 

    update code_translations set msgstr = 'Responsable' where msgid = 'code:10019:bearb' and locale = 'fr';
    insert into alma.translations (
        msgid
        , msgstr
        , locale
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select distinct
        ct.msgid
        , ct.msgstr
        , ct.locale
        , ct.erfassungs_datum
        , ct.erfasser_kuerzel
        , ct.mutations_datum
        , ct.mutierer_kuerzel
    from code_translations ct
    where not exists (
        select 1 from alma.translations t
        where (string_to_array(t.msgid, ':'))[2] = (string_to_array(ct.msgid, ':'))[2]
          and t.locale = ct.locale
          and lower(t.msgstr) = lower(ct.msgstr)
    )
    on conflict (msgid, locale) do nothing
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_bere() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.bere (
        vflz_id
        , h_bere_res_abwbewe
        , c_bere_res_abwbewe
        , h_bere_prio_untersuch
        , c_bere_prio_untersuch
        , h_bere_prio_sanier
        , c_bere_prio_sanier
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        vflz_id
        , h_bere_res_abwbewe
        , c_bere_res_abwbewe
        , 26020
        , bere_prio_untersuch
        , 26021
        , bere_prio_sanier
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.bere
    left join altlast_hist.snapshot hs on bere.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_mass() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.mass (
        mass_id
        , vflz_id
        , h_massnahme
        , c_massnahme
        , dat_massnahme
        , ang_massnahme
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        mass_id
        , vflz_id
        , h_massnahme
        , c_massnahme
        , dat_massnahme
        , ang_massnahme
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.mass
    left join altlast_hist.snapshot hs on mass.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.mass', 'mass_id'),
        (select max(mass_id) from alma.mass)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_sani() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.sani (
        sani_id
        , vflz_id
        , h_saniziel
        , c_saniziel
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        sani_id
        , vflz_id
        , h_saniziel
        , c_saniziel
        , erfassungs_datum
        , erfasser_kuerzel
        , mutations_datum
        , mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.sani
    left join altlast_hist.snapshot hs on sani.vflz_id = hs.key_value
    ;

    get diagnostics num_rows = row_count;

    perform setval(
        pg_get_serial_sequence('alma.sani', 'sani_id'),
        (select max(sani_id) from alma.sani)
    );

    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_h_gem() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.h_gem (
        h_gem_id
        , bfs_nummer
        , gemeinde
        , wkb_geometry
        , h_kanton
        , c_kanton
    )
    select
        g.h_gem_id
        , g.bfs_nummer
        , g.gemeinde
        , _g.wkb_geometry
        , g.h_kanton
        , g.c_kanton
    from altlast.h_gem g left join altlast._kantone k on g.c_kanton = k.gdekt
    join altlast._gemeinden _g on g.bfs_nummer = _g.bfs_nr
    ;

    -- Dummy gemeinde for dummy parcel
    insert into alma.h_gem (h_gem_id, bfs_nummer, gemeinde)
    values('-1', '-1', 'unbekannt');

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_kantone() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma._kantone (
        ktnr
        , gdekt
        , gdektna
    )
    select
        k.ktnr
        , k.gdekt
        , k.gdektna
    from altlast._kantone k
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_subj() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.subj (
        subj_id
        , "name"
        , vorname
        , taetigkeit
        , kuerzel
        , h_land
        , c_land
        , h_anrede
        , c_anrede
        , ident_nr
        , import_key
        , ort
        , postleitzahl
        , strasse
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        s.subj_id
        , coalesce(s.name, '')
        , coalesce(s.vorname, '')
        , coalesce(s.taetigkeit, '')
        , s.kuerzel
        , a.h_land
        , a.c_land
        , p.h_anrede
        , p.c_anrede
        , case
            when s.external_id is not null then concat('TG', '; external_id: ', s.external_id)
            when s.original_id is not null or s.original_person_id is not null or s.original_adresse_id is not null
                then concat('FL', '; original_id: ', s.original_id, '; original_person_id: ', s.original_person_id, '; original_adresse_id: ', s.original_adresse_id)
            else null
          end
        , null
        , coalesce(a.ort, '')
        , coalesce(a.postleitzahl, '')
        , case
            when a.postleitzahl is null then ''
            when a.hausnummer is not null then concat(a.strasse, ' ', a.hausnummer)
            else coalesce(a.strasse, '')
          end
        , greatest(a.erfassungs_datum, s.erfassungs_datum)
        , case
            when a.erfassungs_datum > s.erfassungs_datum then a.erfasser_kuerzel
            else s.erfasser_kuerzel
          end
        , greatest(s.mutations_datum, a.mutations_datum)
        , case
            when a.mutations_datum > s.mutations_datum then a.mutierer_kuerzel
            else s.mutierer_kuerzel
          end
    from altlast.subj s 
        left join altlast.subj_adr sad on s.subj_id = sad.subj_id 
        left join altlast.adr a on sad.adr_id = a.adr_id
        left join altlast.pers p on p.subj_id = s.subj_id
    ;

    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.subj', 'subj_id'),
        (select max(subj_id) from alma.subj)
    );
    return num_rows;
end;
$$ language plpgsql;



create or replace function import_altlast.import_grun() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.grun (
        grun_id
        , h_gem_id
        , h_nb_id
        , gb_nummer
        , egrid
        , h_grun_status
        , c_grun_status
        , wkb_geometry
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer

    )
    select
        g.grun_id
        , g.h_gem_id
        , sektion
        , g.gb_nummer
        , null
        , 26000
        , case
            when g.c_status = true then '1'
            when g.c_status = false then '0'
            else null
          end
        , g.wkb_geometry
        , g.erfassungs_datum
        , g.erfasser_kuerzel
        , g.mutations_datum
        , g.mutierer_kuerzel
    from altlast.grun g
    ;

    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.grun', 'grun_id'),
        (select max(grun_id) from alma.grun)
    );

    insert into alma.grun (
        h_gem_id
        , gb_nummer
        , h_grun_status
        , c_grun_status
    )
    values (-1, 'dummy', 26000, '0');

    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_bet_bet_art() returns jsonb as $$
declare
    num_rows_bet integer := 0;
    num_rows_bet_art integer := 0;
    num_rows_eigentum_without_parcels integer := 0;
begin
    -- Lookup table to get the bet_id for any  entry in subj_vlz
    create temporary table bet_id_lookup as (
        select
            max(subj_vflz_id) over (partition by vflz_id, subj_id) as bet_id,
            subj_vflz_id,
            vflz_id,
            subj_id
        from altlast.subj_vflz
    );
    alter table bet_id_lookup add primary key (subj_vflz_id);

    -- Insert an entry into alma.bet for every unique combination of (vflz_id, subj_id) in subj_vflz
    insert into alma.bet (
        bet_id
        , vflz_id
        , subj_id
        , is_eigentuemer
        , is_sachbearbeiter
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select distinct on (l.bet_id)
        l.bet_id
        , l.vflz_id
        , l.subj_id
        , false
        , false
        , now()
        , 'geko'
        , now()
        , 'geko'
        , coalesce(hs.is_current, true)
    from bet_id_lookup l
    left join altlast_hist.snapshot hs on l.vflz_id = hs.key_value
    order by l.bet_id
    ;

    get diagnostics num_rows_bet = row_count;

    update alma.bet set is_eigentuemer = true
    where exists (
        select 1
        from bet_id_lookup l
        join altlast.subj_vflz_grun svg using (subj_vflz_id)
        where l.bet_id = bet.bet_id
    );

    update alma.bet set is_sachbearbeiter = true
    where exists (
        select 1
        from bet_id_lookup l
        join altlast_admin.acl_user u using (subj_id)
        where l.bet_id = bet.bet_id
    );

    insert into alma.bet_art (
        bet_id
        , grun_id
        , h_bez_art
        , c_bez_art
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        l.bet_id
        , case
            when sv.h_subj_vflz_bez_art = 22 and cb.eigen then coalesce(
                svg.grun_id,
                (select grun_id from alma.grun where gb_nummer = 'dummy')
            )
            else svg.grun_id
          end
        , case
            when sv.h_subj_vflz_bez_art = 22 and cb.eigen then 2200 -- Codeliste Beziehungsart Eigentum
            when sv.h_subj_vflz_bez_art = 22 and sv.c_subj_vflz_bez_art= 'sachbearbeitung' then 2202 -- Codeliste Beziehungsart Sachbearbeitung
            when sv.h_subj_vflz_bez_art = 22 then 2201 -- Codeliste Beziehungsart Sonstige
            else sv.h_subj_vflz_bez_art
          end
        , sv.c_subj_vflz_bez_art
        , sv.erfassungs_datum
        , sv.erfasser_kuerzel
        , sv.mutations_datum
        , sv.mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from bet_id_lookup l
    left join altlast.subj_vflz sv using (subj_vflz_id)
    left join altlast.subj_vflz_grun svg using (subj_vflz_id)
    left join altlast_hist.snapshot hs on l.vflz_id = hs.key_value
    left join altlast.cod_bezart cb on (sv.h_subj_vflz_bez_art, sv.c_subj_vflz_bez_art) = (cb.c_cli_id_grun_subj, cb.grun_subj)
    group by bet_id, svg.grun_id, sv.h_subj_vflz_bez_art, sv.c_subj_vflz_bez_art, sv.erfassungs_datum, sv.erfasser_kuerzel, sv.mutations_datum, sv.mutierer_kuerzel, cb.eigen, hs.is_current 
    ;
    get diagnostics num_rows_bet_art = row_count;

    select
        count(*)
    into num_rows_eigentum_without_parcels
    from alma.bet_art bet_art
    join alma.grun grun on bet_art.grun_id = grun.grun_id
    where grun.gb_nummer = 'dummy'
    ;

    update alma.bet set is_eigentuemer = true
    where exists (
        select 1
        from alma.bet_art bet_art
        join alma.bet bet on bet_art.bet_id = bet.bet_id
        where bet_art.h_bez_art = 2200 and bet.bet_id = alma.bet.bet_id
    );


    return jsonb_build_object(
        'bet', num_rows_bet,
        'bet_art', num_rows_bet_art,
        'eigentum_without_parcels', num_rows_eigentum_without_parcels
    );

    perform setval(
        pg_get_serial_sequence('alma.bet', 'bet_id'),
        (select max(bet_id) from alma.bet)
    );

    perform setval(
        pg_get_serial_sequence('alma.bet_art', 'bet_art_id'),
        (select max(bet_art_id) from alma.bet_art)
    );
end;
$$ language plpgsql;


create or replace function import_altlast.import_kontakt() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.kontakt (
        kontakt_id
        , kontakt
        , h_kontakt_typ
        , c_kontakt_typ
        , subj_id
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        t.tele_id
        , t.tele
        , t.h_tele_typ
        , t.c_tele_typ
        , t.subj_id
        , t.erfassungs_datum
        , t.erfasser_kuerzel
        , t.mutations_datum
        , t.mutierer_kuerzel
    from altlast.tele t
    where t.tele is not null
    ;

    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.kontakt', 'kontakt_id'),
        (select max(kontakt_id) from alma.kontakt)
    );
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_grun_subj() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.grun_subj (
        grun_subj_id
        , grun_id
        , subj_id
        , h_eigentums_art
        , c_eigentums_art
        , c_status
        , bemerkungen
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        gs.grun_subj_id
        , gs.grun_id
        , gs.subj_id
        , case
            when gs.h_eigentums_art = 22 and cb.eigen then 2200 -- Codeliste Beziehungsart Eigentum
            when gs.h_eigentums_art = 22 and gs.c_eigentums_art = 'sachbearbeitung' then 2202 -- Codeliste Beziehungsart Sachbearbeitung
            when gs.h_eigentums_art = 22 then 2201 -- Codeliste Beziehungsart Sonstige
            else gs.h_eigentums_art
          end
        , gs.c_eigentums_art
        , gs.c_status
        , gs.bemerkungen
        , gs.erfassungs_datum
        , gs.erfasser_kuerzel
        , gs.mutations_datum
        , gs.mutierer_kuerzel

    from altlast.grun_subj gs
    left join altlast.cod_bezart cb on (gs.h_eigentums_art, gs.c_eigentums_art) = (cb.c_cli_id_grun_subj, cb.grun_subj)
    ;

    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.grun_subj', 'grun_subj_id'),
        (select max(grun_subj_id) from alma.grun_subj)
    );
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_pool() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.pool (
        pool_id
        , bezeichnung
        , bemerkungen
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        p.pool_id
        , p.bezeichnung
        , p.bemerkungen
        , p.erfassungs_datum
        , p.erfasser_kuerzel
        , p.mutations_datum
        , p.mutierer_kuerzel
    from altlast.pool p
    ;

    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.pool', 'pool_id'),
        (select max(pool_id) from alma.pool)
    );
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_vfl_pool() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.vfl_pool (
        vfl_pool_id
        , pool_id
        , vfl_id
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        vp.vfl_pool_id
        , vp.pool_id
        , vp.vfl_id
        , vp.erfassungs_datum
        , vp.erfasser_kuerzel
        , vp.mutations_datum
        , vp.mutierer_kuerzel
    from altlast.vfl_pool vp
    ;

    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.vfl_pool', 'vfl_pool_id'),
        (select max(vfl_pool_id) from alma.vfl_pool)
    );
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_subj_category() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.subj_category (
        subj_category_id
        , subj_id
        , h_subj_category
        , c_subj_category
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        sc.subj_category_id
        , sc.subj_id
        , sc.h_category
        , sc.c_category
        , sc.erfassungs_datum
        , sc.erfasserkuerzel
        , sc.mutations_datum
        , sc.mutierer_kuerzel
    from altlast.subj_category sc
    ;

    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.subj_category', 'subj_category_id'),
        (select max(subj_category_id) from alma.subj_category)
    );
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_vflnr() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma.vflnr (
        vflnr_id
        , vflz_id
        , h_org_kuerzel
        , c_org_kuerzel
        , aktiv
        , nummer
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
        , is_current
    )
    select
        vn.vflnr_id
        , vn.vflz_id
        , 26030
        , case when org.kuerzel is null then '' else lower(org.kuerzel) end
        , vn.aktiv
        , case when vn.nummer is null then '' else vn.nummer end 
        , vn.erfassungs_datum
        , vn.erfasser_kuerzel
        , vn.mutations_datum
        , vn.mutierer_kuerzel
        , coalesce(hs.is_current, true)
    from altlast.vflnr vn 
        left join altlast_hist.snapshot hs on vn.vflz_id = hs.key_value
        left join altlast.vflz vz on vn.vflz_id = vz.vflz_id
        left join altlast.org org on vn.org_id = org.org_id
    where vn.aktiv is true
    ;
    get diagnostics num_rows = row_count;
    perform setval(
        pg_get_serial_sequence('alma.vflnr', 'vflnr_id'),
        (select max(vflnr_id) from alma.vflnr)
    );
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_interlis_cod_mapping() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma_export.interlis_cod_mapping (
        ili_code
        , ili_c_cli_id
        , code
        , c_cli_id
    )
    select
        icm.ili_code
        , icm.ili_c_cli_id
        , icm.code
        , icm.c_cli_id
    from altlast_ili.cod_mapping icm
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;


create or replace function import_altlast.import_interlis_cod_long() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma_export.interlis_cod_long (
        code
        , c_cli_id
        , code_long
    )
    select
        icl.code
        , icl.c_cli_id
        , icl.code_long
    from altlast_ili.cod_long icl
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;

create or replace function import_altlast.import_interlis_task_mapping() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma_export.interlis_task_mapping (
        ili_code 
        , ili_c_cli_id
        , pro_uid
        , tas_uid
        , a4w_code
    )
    select
        itm.ili_code
        , itm.ili_c_cli_id
        , itm.pro_uid
        , itm.tas_uid
        , itm.a4w_code
    from altlast_ili.task_mapping itm
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;

create or replace function import_altlast.import_interlis_language_ordering() returns integer as $$
declare
    num_rows integer := 0;
begin  
    insert into alma_export.interlis_language_ordering (
        language_ordering_id
        , lang
        , sort_key
    )
    select
        ilo.language_ordering_id
        , ilo.lang
        , ilo.sort_key
    from altlast_ili.language_ordering ilo
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;

create or replace function import_altlast.import_interlis_oereb_weitere_dokumente() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma_export.interlis_oereb_weitere_dokumente (
        dokument_tid
        , beschreibung
        , url_de
        , url_fr
        , url_it
        , rechtsstatus
        , publiziert_ab 
        , titel_de
        , titel_fr
        , titel_it
        , titel_rm
        , auszugindex
    )
    select
        iowd.dokument_tid
        , iowd.beschreibung
        , iowd.url_de
        , iowd.url_fr
        , iowd.url_it
        , iowd.rechtsstatus
        , iowd.publiziert_ab
        , iowd.titel_de
        , iowd.titel_fr
        , iowd.titel_it
        , iowd.titel_rm
        , iowd.auszugindex
    from altlast_ili.oereb_weitere_dokumente iowd
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;

create or replace function import_altlast.import_interlis_symbol() returns integer as $$
declare
    num_rows integer := 0;
begin
    insert into alma_export.interlis_symbol (
        code
        , c_cli_id 
        , symbol 
        , thema 
        , def_code
        , artcodeliste
        , url_verweiswms
        , legende_status
        , geometrytype
        , export
    )
    select
        isy.code
        , isy.c_cli_id
        , isy.symbol
        , isy.thema
        , isy.def_code
        , isy.artcodeliste
        , isy.url_verweiswms
        , isy.legende_status
        , isy.geometrytype
        , isy.export
    from altlast_ili.symbol isy
    ;

    get diagnostics num_rows = row_count;
    return num_rows;
end;
$$ language plpgsql;


drop function if exists import_altlast.import_wf_node();

create or replace function import_altlast.import_wf_node(source text default 'demo') returns jsonb as $$
declare
    num_rows_wf_node_workflow integer := 0;
    num_rows_wf_node_task integer := 0;
    num_rows_wf_node_document integer := 0;
    num_rows_wf_node_form integer := 0;
    num_rows_bet_task_task integer := 0;
    num_rows_bet_task_doc integer := 0;
    num_rows_asset integer := 0;
    num_rows_wf_node_note integer := 0;
    wf_node_id_before_insert bigint := 0;
    num_rows_wf_node_document_manual_import_a4w integer := 0;
    num_rows_wf_node_document_attached_to_steps integer := 0;
    num_rows_wf_node_document_empty_steps_manual_import_a4w integer := 0;
    num_rows_wf_node_document_not_attached_to_steps integer := 0;

begin

    raise notice 'QA: Documents in app_document table with no pm_doc (we take pm_doc as ground truth).';
    raise notice 'Count: %', (select count(*)
    from wf_workflow.app_document ad
    where not exists (select 1 from altlast.pm_doc where app_doc_uid = ad.app_doc_uid));

    raise notice 'QA: pm docs that have no entry in pm_cache_v';
    raise notice 'Count: %', (select count(*) from altlast.pm_doc pd where not exists (select 1 from altlast.pm_cache_v where pm_cache_id = pd.pm_cache_id));

    raise notice 'QS: Number of documents in pm_doc table with a corresponding app_document:';
    raise notice 'Count: %', (select count(*) from altlast.pm_doc pd join wf_workflow.app_document ad on ad.app_doc_uid = pd.app_doc_uid);


    raise notice 'QA: Files that were manually imported into processmaker. They have doc_uid = null OR doc_uid is not present in the step table';
    raise notice 'Count: %', (select count(*)
    from altlast.pm_doc pd
    join wf_workflow.app_document ad on pd.app_doc_uid = ad.app_doc_uid
    where
        not exists (select 1 from wf_workflow.step where step_uid_obj = ad.doc_uid)
        and (not ad.doc_uid = 'WITHOUT' or ad.doc_uid is null)
    );

    raise notice 'QA: Files that were uploaded in a4w and are assigned to a step.';
    raise notice 'Count: %', (select count(*)
    from altlast.pm_cache_v pcv
    join altlast.pm_doc pd on pcv.pm_cache_id = pd.pm_cache_id
    join wf_workflow.app_document ad on ad.app_doc_uid = pd.app_doc_uid
    where
        exists (select 1 from wf_workflow.step where step_uid_obj = ad.doc_uid)
    );

    raise notice 'QA: Files that are not assigned to a step. They have doc_uid=WITHOUT';
    raise notice 'Count: %', (select count(*) from altlast.pm_doc pd join wf_workflow.app_document ad on ad.app_doc_uid = pd.app_doc_uid where ad.doc_uid = 'WITHOUT');

    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref
        , url
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select 
        pc.con_value as title
        ,'workflow' as type
        , null as wf_config_id
        , null as version
        , null as parent_id 
        , false as is_moveable
        , case when pcv.status is null then 'inactive' 
            when pcv.status = 'CLOSED' then 'finished'
            when pcv.status = 'OPEN' then 'started'
            else 'skipped' 
        end as status 
        , coalesce(pcv.start_date, pcv.end_date, '01-01-1700'::date) as started_at 
        , case when pcv.status = 'CLOSED' then pcv.end_date else null end as finished_at 
        , case when pcv.status = 'CLOSED' then null else pcv.due_date end as deadline
        , pv.vfl_id as entity_id
        , pv.pm_vfl_id as note
        , null as form_config 
        , null as form_data 
        , null as document_ref 
        , null as url
        , false as is_public
        , pv.erfassungs_datum
        , pv.erfasser_kuerzel
        , pv.mutations_datum 
        , pv.mutierer_kuerzel

    from altlast.pm_vfl pv
    left join altlast.pm_content pc on pc.con_id::text = pv.pro_uid::text
    left join (select pm_vfl_id, vfl_id, pro_uid, pro_title, max(status) as status, 
            min(tas_delegate_date) as start_date, max(tas_finish_date) as end_date, 
            max(tas_due_date) as due_date from altlast.pm_cache_v 
        group by vfl_id, pro_uid, pro_title, pm_vfl_id)pcv on pcv.pm_vfl_id = pv.pm_vfl_id 
    where con_lang = 'de' and pv.vfl_id in (select vfl_id from altlast.vflz)
;

    get diagnostics num_rows_wf_node_workflow = row_count;

    update alma.wf_node set title = trim(chr(9) from trim(title)) where type = 'workflow';

    select coalesce(max(wf_node_id), 0) into wf_node_id_before_insert from alma.wf_node;

    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref 
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select
        pcv.tas_title as title
        ,'task' as type
        , null as wf_config_id
        , null as version
        , wfn.wf_node_id as parent_id 
        , false as is_moveable
        , case when pcv.status is null then 'inactive' 
            when pcv.status = 'CLOSED' then 'finished'
            when pcv.status = 'OPEN' then 'started'
            else 'skipped' 
        end as status 
        , coalesce(pcv.tas_delegate_date, pcv.tas_finish_date, '01-01-1700'::date) as started_at 
        , case when pcv.status = 'CLOSED' then pcv.tas_finish_date else null end as finished_at 
        , pcv.tas_due_date as deadline
        , pcv.vfl_id as entity_id
        , pcv.pm_cache_id as note
        , null as form_config 
        , null as form_data 
        , null as document_ref 
        , false as is_public
        , null as erfassungs_datum
        , null as erfasser_kuerzel
        , null as mutations_datum 
        , null as mutierer_kuerzel
    from altlast.pm_cache_v pcv
    left join alma.wf_node wfn on wfn.note::bigint = pcv.pm_vfl_id
    where pcv.vfl_id is not null and pcv.vfl_id in (select vflz_id from altlast.vflz)
    order by pcv.pm_cache_id  -- ensure consistent ordering
    ;

    get diagnostics num_rows_wf_node_task = row_count;

    update alma.wf_node set title = trim(chr(9) from trim(title)) where type = 'task';
    with ranked_task_nodes as (
        select
            wf_node_id
            , title
            , row_number() over (
                partition by parent_id, title
                order by wf_node_id
            ) as title_idx
        from alma.wf_node
        where "type" = 'task' and wf_node_id > wf_node_id_before_insert
    )
    update alma.wf_node w
    set title = case
        when ranked_task_nodes.title_idx = 1 then ranked_task_nodes.title
        else concat(ranked_task_nodes.title, ' (', ranked_task_nodes.title_idx, ')')
    end
    from ranked_task_nodes
    where w.wf_node_id = ranked_task_nodes.wf_node_id;


    insert into alma.bet_task (
        subj_id
        , wf_node_id
        , vfl_id 
        , h_bez_art
        , c_bez_art
        , erfassungs_datum
        , erfasser 
        , mutations_datum 
        , mutierer
    )
        select 
        pcs.subj_id
        , wfn.wf_node_id
        , pcv.vfl_id
        , case when pcs.c_pm_cache_subj_bez_art = '12' then 2202 else 2203 end as h_bez_art
        , case when pcs.c_pm_cache_subj_bez_art = '12' then 'sachbearbeitung' else c_pm_cache_subj_bez_art end as c_bez_art
        , pcs.erfassungs_datum
        , pcs.erfasser_kuerzel 
        , pcs.mutations_datum 
        , pcs.mutierer_kuerzel
    from altlast.pm_cache_subj pcs
    join altlast.pm_cache_v pcv on pcv.pm_cache_id = pcs.pm_cache_id
    join alma.wf_node wfn on wfn.note::bigint = pcv.pm_cache_id
    where pcs.subj_id in (select subj_id from alma.subj)
    ;

    get diagnostics num_rows_bet_task_task = row_count;

    select coalesce(max(wf_node_id), 0) into wf_node_id_before_insert from alma.wf_node;

    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref 
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select 
        form.title
        ,'form' as type
        , null as wf_config_id
        , null as version
        , wfn.wf_node_id as parent_id
        , false as is_moveable
        , 'finished' as status  --  TODO what is the form status?
        , wfn.started_at as started_at  -- TODO set started_at/finished_at date based on task?
        , null as finished_at  -- TODO
        , null as deadline  -- TODO
        , pcv.vfl_id as entity_id
        , form.step_uid as note
        , form.form_config as form_config
        , form.form_data as form_data
        , null as document_ref
        , false as is_public
        , null as erfassungs_datum
        , null as erfasser_kuerzel
        , null as mutations_datum
        , null as mutierer
    from wf_workflow.forms_imported as form
    join wf_workflow.step s
        on s.tas_uid = form.tas_uid
       and s.step_uid = form.step_uid
    join wf_workflow.task t
        on t.tas_uid = form.tas_uid
    join altlast.pm_cache_v pcv using (pm_cache_id)
    join alma.wf_node wfn on (
        wfn.note::bigint = pcv.pm_cache_id
    )
    where pcv.vfl_id is not null
    order by pcv.pm_cache_id  -- ensure consistent ordering
    ;

    get diagnostics num_rows_wf_node_form = row_count;

    update alma.wf_node set title = trim(chr(9) from trim(title)) where type = 'form';

    with ranked_form_nodes as (
        select
            w.wf_node_id
            , w.title
            , row_number() over (
                partition by case
                    when parent.type = 'workflow' then parent.wf_node_id
                    else parent.parent_id
                end, w.title
                order by w.wf_node_id
            ) as title_idx
        from alma.wf_node w
        join alma.wf_node parent on parent.wf_node_id = w.parent_id
        where w."type" = 'form' and w.wf_node_id > wf_node_id_before_insert
    )
    update alma.wf_node w
    set title = case
        when ranked_form_nodes.title_idx = 1 then ranked_form_nodes.title
        else concat(ranked_form_nodes.title, ' (', ranked_form_nodes.title_idx, ')')
    end
    from ranked_form_nodes
    where w.wf_node_id = ranked_form_nodes.wf_node_id;

    select coalesce(max(wf_node_id), 0) into wf_node_id_before_insert from alma.wf_node;

    -- these documents are imported manually into a4w
    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref
        , url
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select
        coalesce(pd.app_doc_title, 'Unbekannter Titel') as title
        , 'document' as "type"
        , null as wf_config_id
        , null as version
        , dok_import_node.wf_node_id as parent_id
        , false as is_movable
        , 'finished' as status
        , case when pd.app_doc_receipt_date is null then dok_import_node.started_at else pd.app_doc_receipt_date end as started_at 
        , case when pd.app_doc_receipt_date is null then dok_import_node.started_at else pd.app_doc_receipt_date end as finished_at 
        , null as deadline
        , pcv.vfl_id as entity_id
        , pd.app_doc_comment as note
        , to_jsonb(pd.app_doc_category::text) as form_config 
        , null as form_data 
        , case
            when btrim(pd.app_doc_filename) != '' and pd.app_doc_filename is not null then pd.app_doc_uid::uuid
          end as document_ref
        , pd.app_doc_url as url
        , false as is_public
        , null as erfassungs_datum
        , null as erfasser_kuerzel
        , null as mutations_datum 
        , pd.pm_doc_id as mutierer_kuerzel
    from altlast.pm_doc pd 
    join altlast.pm_cache_v pcv on pcv.pm_cache_id = pd.pm_cache_id
    join alma.wf_node dok_import_node on dok_import_node.note::bigint = pd.pm_cache_id
    join wf_workflow.app_document ad on pd.app_doc_uid = ad.app_doc_uid
    where
        dok_import_node.type = 'task'
        and (ad.doc_uid != 'WITHOUT' or ad.doc_uid is null)
        and not exists (select 1 from wf_workflow.step where step_uid_obj = ad.doc_uid)
    ;

    get diagnostics num_rows_wf_node_document_manual_import_a4w = row_count;

    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref
        , url
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select
        coalesce(pd.app_doc_title, 'Unbekannter Titel') as title
        , 'document' as "type"
        , null as wf_config_id
        , null as version
        , task_node.wf_node_id as parent_id
        , false as is_movable
        , 'finished' as status
        , case when pd.app_doc_receipt_date is null then task_node.started_at else pd.app_doc_receipt_date end as started_at 
        , case when pd.app_doc_receipt_date is null then task_node.started_at else pd.app_doc_receipt_date end as finished_at 
        , null as deadline
        , pcv.vfl_id as entity_id
        , pd.app_doc_comment as note
        , to_jsonb(pd.app_doc_category::text) as form_config 
        , null as form_data 
        , case
            when btrim(pd.app_doc_filename) != '' and pd.app_doc_filename is not null then pd.app_doc_uid::uuid
          end as document_ref
        , pd.app_doc_url as url
        , false as is_public
        , null as erfassungs_datum
        , null as erfasser_kuerzel
        , null as mutations_datum
        , pd.pm_doc_id as mutierer_kuerzel
    from altlast.pm_doc pd 
    join altlast.pm_cache_v pcv on pd.pm_cache_id = pcv.pm_cache_id
    join alma.wf_node task_node on task_node.note::bigint = pcv.pm_cache_id
    join wf_workflow.app_document ad on pd.app_doc_uid = ad.app_doc_uid
    where
        task_node.type = 'task'
        and ad.doc_uid = 'WITHOUT'
    ;
    get diagnostics num_rows_wf_node_document_not_attached_to_steps = row_count;
 
    -- these documents are assigned to steps and were uploaded from a4w application
    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref
        , url
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select
        concat(coalesce(step_con.con_value, ' ')) as title
        ,'document' as type
        , null as wf_config_id
        , null as version
        , task_node.wf_node_id as parent_id 
        , false as is_moveable
        , 'finished' as status
        , case when pd.app_doc_receipt_date is null then task_node.started_at else pd.app_doc_receipt_date end as started_at 
        , case when pd.app_doc_receipt_date is null then task_node.started_at else pd.app_doc_receipt_date end as finished_at 
        , null as deadline
        , pcv.vfl_id as entity_id
        , pd.app_doc_comment as note
        , to_jsonb(pd.app_doc_category::text) as form_config 
        , null as form_data 
        , case
            when btrim(pd.app_doc_filename) != '' and pd.app_doc_filename is not null then pd.app_doc_uid::uuid
          end as document_ref
        , pd.app_doc_url as url
        , false as is_public
        , null as erfassungs_datum
        , s.step_uid as erfasser_kuerzel
        , null as mutations_datum 
        , pd.pm_doc_id as mutierer_kuerzel
    from altlast.pm_cache_v pcv
    join wf_workflow.app_delegation del using (app_uid, del_index, tas_uid)
    join altlast.pm_doc pd on pcv.pm_cache_id = pd.pm_cache_id
    join wf_workflow.step s on (
        s.tas_uid = del.tas_uid
        and s.step_position <= del.step_position
    )
    join wf_workflow.app_document ad on (
        pd.app_doc_uid = ad.app_doc_uid
        and s.step_uid_obj = ad.doc_uid
        and pcv.app_uid = ad.app_uid
    )
    join alma.wf_node task_node on task_node.note::bigint = pcv.pm_cache_id
    join wf_workflow.content step_con on s.step_uid_obj = step_con.con_id
    where
        step_con.con_category in ('INP_DOC_TITLE', 'APP_DOC_TITLE', 'OUT_DOC_TITLE')
        and task_node."type" = 'task'
        and step_con.con_lang = 'de'
        and (ad.doc_uid is not null and ad.doc_uid != 'WITHOUT')
    ;
   
    get diagnostics num_rows_wf_node_document_attached_to_steps = row_count;


    -- create empty document steps for steps that were imported
    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref
        , url
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select
        coalesce(step_con.con_value, '') as title
        , 'document' as "type"
        , null as wf_config_id
        , null as version
        , task_node.wf_node_id as parent
        , false as is_movable
        , 'finished' as status
        , task_node.started_at as started_at 
        , task_node.started_at as finished_at 
        , null as deadline
        , pcv.vfl_id as entity_id
        , null as note
        , '{}'::jsonb as form_config 
        , null as form_data 
        , null as document_ref
        , null as url
        , false as is_public
        , null as erfassungs_datum
        , s.step_uid as erfasser_kuerzel
        , null as mutations_datum 
        , null as mutierer_kuerzel
    from altlast.pm_cache_v pcv
    join wf_workflow.app_delegation del using (app_uid, del_index, tas_uid)
    join wf_workflow.step s on (
        s.tas_uid = del.tas_uid
        and s.step_position <= del.step_position
    )
    join alma.wf_node task_node on task_node.note::bigint = pcv.pm_cache_id
    join wf_workflow.content step_con on s.step_uid_obj = step_con.con_id
    where
        step_con.con_category in ('INP_DOC_TITLE', 'APP_DOC_TITLE', 'OUT_DOC_TITLE')
        and task_node."type" = 'task'
        and step_con.con_lang = 'de'
        and not exists (
            select 1 from wf_workflow.app_document where app_uid = del.app_uid and doc_uid = s.step_uid_obj
        )
    ;

    get diagnostics num_rows_wf_node_document_empty_steps_manual_import_a4w = row_count;

    update alma.wf_node set title = trim(chr(9) from trim(title)) where type = 'document';



    with ranked_document_nodes as (
        select
            w.wf_node_id
            , w.title
            , row_number() over (
                partition by case
                    when parent.type = 'workflow' then parent.wf_node_id
                    else parent.parent_id
                end, w.title
                order by w.wf_node_id
            ) as title_idx
        from alma.wf_node w
        join alma.wf_node parent on parent.wf_node_id = w.parent_id
        where w."type" = 'document' and w.wf_node_id > wf_node_id_before_insert
    )
    update alma.wf_node w
    set title = case
        when ranked_document_nodes.title_idx = 1 then ranked_document_nodes.title
        else concat(ranked_document_nodes.title, ' (', ranked_document_nodes.title_idx, ')')
    end
    from ranked_document_nodes
    where w.wf_node_id = ranked_document_nodes.wf_node_id;

    select coalesce(max(wf_node_id), 0) into wf_node_id_before_insert from alma.wf_node;

    with ranked_attachment_nodes as (
        select
            w.wf_node_id
            , w.title
            , row_number() over (
                partition by case
                    when parent.type = 'workflow' then parent.wf_node_id
                    else parent.parent_id
                end, w.title
                order by w.wf_node_id
            ) as title_idx
        from alma.wf_node w
        join alma.wf_node parent on parent.wf_node_id = w.parent_id
        where w."type" = 'document' and w.wf_node_id > wf_node_id_before_insert
    )
    update alma.wf_node w
    set title = case
        when ranked_attachment_nodes.title_idx = 1 then ranked_attachment_nodes.title
        else concat(ranked_attachment_nodes.title, ' (', ranked_attachment_nodes.title_idx, ')')
    end
    from ranked_attachment_nodes
    where w.wf_node_id = ranked_attachment_nodes.wf_node_id;


    insert into alma.bet_task (
        subj_id
        , wf_node_id
        , vfl_id 
        , h_bez_art
        , c_bez_art
        , erfassungs_datum
        , erfasser 
        , mutations_datum 
        , mutierer
    )
        select 
        pds.subj_id
        , wfn.wf_node_id
        , wfn.entity_id
        , case when pds.c_pm_doc_subj_bez_art = '12' then 2202 else 2203 end as h_bez_art
        , case when pds.c_pm_doc_subj_bez_art = '12' then 'sachbearbeitung' else c_pm_doc_subj_bez_art end as c_bez_art
        , pds.erfassungs_datum
        , pds.erfasser_kuerzel
        , pds.mutations_datum 
        , pds.mutierer_kuerzel
    from altlast.pm_doc_subj pds
    join altlast.pm_doc pd on pd.pm_doc_id = pds.pm_doc_id
    join alma.wf_node wfn on wfn.updated_by::bigint = pd.pm_doc_id and wfn.type = 'document'
    where pds.subj_id in (select subj_id from alma.subj)
    ;

    get diagnostics num_rows_bet_task_doc = row_count;


    insert into documents.asset (
        uuid
        , file_path
        , original_file_name
        , title
        , file_type
        , created_at
        , modified_at
    )
    select
        pd.app_doc_uid::uuid as uuid
        , concat(
            pc.app_uid,
            '/',
            case
                when upper(pd.app_doc_type) like 'INPUT%' then 'indocs'
                when upper(pd.app_doc_type) like 'OUTPUT%' then 'outdocs'
            end,
            '/',
            btrim(pd.app_doc_filename)
        ) as file_path
        , btrim(pd.app_doc_filename) as original_file_name
        , pd.app_doc_title as title
        , '' as file_type
        , coalesce(pd.app_doc_create_date, now()) as created_at
        , coalesce(pd.app_doc_create_date, now()) as modified_at
    from altlast.pm_doc pd
    join altlast.pm_cache pc on pc.pm_cache_id = pd.pm_cache_id
    join alma.wf_node wn on pd.app_doc_uid::uuid = wn.document_ref::uuid
    where pd.app_doc_uid is not null
        and nullif(btrim(pd.app_doc_filename), '') is not null
        and pd.app_doc_filename != coalesce(pd.app_doc_url, '')
        and (
            upper(pd.app_doc_type) like 'INPUT%'
            or upper(pd.app_doc_type) like 'OUTPUT%'
        )
    ;
    get diagnostics num_rows_asset = row_count;

    insert into alma.wf_node (
        title 
        , "type" 
        , wf_config_id 
        , version 
        , parent_id 
        , is_moveable
        , status 
        , started_at 
        , finished_at 
        , deadline
        , entity_id
        , note
        , form_config 
        , form_data 
        , document_ref 
        , is_public
        , created_at
        , created_by
        , updated_at
        , updated_by
    )
    select
        'Interne Anmerkung' as title
        ,'note' as type
        , null as wf_config_id
        , null as version
        , null as parent_id 
        , false as is_moveable
        , 'finished' as status
        , min(bem.erfassungs_datum) as started_at 
        , max(bem.mutations_datum) as finished_at 
        , null as deadline
        , vfl_id as entity_id
        , bem as note
        , null as form_config 
        , null as form_data 
        , null as document_ref 
        , false as is_public
        , min(bem.erfassungs_datum) as erfassungs_datum
        , max(bem.erfasser_kuerzel) as erfasser_kuerzel
        , max(bem.mutations_datum) as mutations_datum 
        , max(bem.mutierer_kuerzel) as mutierer_kuerzel

    from altlast.bem 
    join altlast.vflz on vflz.vflz_id = bem.key_value
    where bemgrp_id = 8
    group by vfl_id, bem
    ;

    get diagnostics num_rows_wf_node_note = row_count;

    if source = 'tg' then
        raise notice 'Analyzing imported workflow tables before TG workflow mapping';
        analyze alma.wf_node;
        analyze alma.wf_config;

        perform import_altlast.set_wf_node_next_node_id();
    end if;

    raise notice 'Updating wf_node titles from pm_doc.app_doc_title where available';
    update alma.wf_node
        set title = app_doc_title
    from altlast.pm_doc 
    where
        pm_doc_id::text = created_by
        and app_doc_title is not null
        and app_doc_title != ''
    ;

    update alma.wf_node set note = null where type != 'document';
    update alma.wf_node set created_by = null where "type" in ('form', 'document');

    return jsonb_build_object(
        'workflow', num_rows_wf_node_workflow,
        'task', num_rows_wf_node_task,
        'document_manual_import_a4w', num_rows_wf_node_document_manual_import_a4w,
        'document_attached_to_steps', num_rows_wf_node_document_attached_to_steps,
        'document_not_attached_to_steps', num_rows_wf_node_document_not_attached_to_steps,
        'document_empty_steps_manual_import_a4w', num_rows_wf_node_document_empty_steps_manual_import_a4w,
        'form', num_rows_wf_node_form,
        'bet_task_task', num_rows_bet_task_task,
        'bet_task_doc', num_rows_bet_task_doc,
        'asset', num_rows_asset,
        'note', num_rows_wf_node_note
    );
end;
$$ language plpgsql;

create or replace function import_altlast.import_task_categories() returns integer as $$
declare
    num_rows_task_category integer := 0;

begin
    insert into alma.task_category (
        wf_node_id
        , h_category
        , c_category
    )
    select 
        wfn.wf_node_id
        , 10022
        ,wfn.form_config->>0
    from alma.wf_node wfn
    where
        wfn.type = 'document'
        and wfn.form_config is not null
        and wfn.form_config != '{}'::jsonb;

    update alma.wf_node set form_config = null 
        where "type" = 'document'
    ;
    get diagnostics num_rows_task_category = row_count;

    return num_rows_task_category;
end;
$$ language plpgsql;

create or replace function import_altlast.import_ktu() returns integer as $$
declare
    num_rows_ktu integer := 0;

begin
    insert into alma.c_cli (c_cli_id, c_status, erfassungs_datum, erfasser)
    values
        (210, true, current_timestamp, 'geko')
    on conflict (c_cli_id) do nothing
    ;

    insert into alma.cod (c_cli_id, code, c_status, erfassungs_datum, erfasser)
    select
        210 as c_cli_id
        , ktu.ktu_id as code
        , true as c_status
        , ktu.erfassungs_datum as erfassungs_datum
        , ktu.erfasser_kuerzel as erfasser
    from altlast.ktu ktu
    on conflict (c_cli_id, code) do nothing
    ;

    get diagnostics num_rows_ktu = row_count;
    insert into alma.translations (
        msgid
        , msgstr
        , locale
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        concat('code:210:', ktu.code) as msgid
        , ktu_orig.kuerzel as msgstr
        , 'de' as locale
        , ktu_orig.erfassungs_datum as erfassungs_datum
        , ktu_orig.erfasser_kuerzel as erfasser
        , ktu_orig.mutations_datum as mutations_datum
        , ktu_orig.mutierer_kuerzel as mutierer
    from alma.cod ktu
        join altlast.ktu ktu_orig on ktu.code = ktu_orig.ktu_id::text
    where ktu.c_cli_id = 210
    on conflict (msgid, locale) do nothing
    ;


    insert into alma.translations (
        msgid
        , msgstr
        , locale
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        concat('code:210:', ktu.code) as msgid
        , ktu_orig.kuerzel as msgstr
        , 'fr' as locale
        , ktu_orig.erfassungs_datum as erfassungs_datum
        , ktu_orig.erfasser_kuerzel as erfasser
        , ktu_orig.mutations_datum as mutations_datum
        , ktu_orig.mutierer_kuerzel as mutierer
    from alma.cod ktu
        join altlast.ktu ktu_orig on ktu.code = ktu_orig.ktu_id::text
    where ktu.c_cli_id = 210
    on conflict (msgid, locale) do nothing
    ;

    insert into alma.translations (
        msgid
        , msgstr
        , locale
        , erfassungs_datum
        , erfasser
        , mutations_datum
        , mutierer
    )
    select
        concat('code:210:', ktu.code) as msgid
        , ktu_orig.kuerzel as msgstr
        , 'it' as locale
        , ktu_orig.erfassungs_datum as erfassungs_datum
        , ktu_orig.erfasser_kuerzel as erfasser
        , ktu_orig.mutations_datum as mutations_datum
        , ktu_orig.mutierer_kuerzel as mutierer
    from alma.cod ktu
        join altlast.ktu ktu_orig on ktu.code = ktu_orig.ktu_id::text
    where ktu.c_cli_id = 210
    on conflict (msgid, locale) do nothing
    ;

    insert into alma.ktu (ktu_id, h_ktu, c_ktu, rangefrom, rangeto)
    select
        ktu.ktu_id
        , 210 as h_ktu
        , ktu.ktu_id as c_ktu
        , ktu.rangefrom
        , ktu.rangeto
    from altlast.ktu ktu where ktu.rangefrom is not null and ktu.rangeto is not null
    ;

    return num_rows_ktu - 1;
end;
$$ language plpgsql;


create or replace function import_altlast.set_wf_node_next_node_id() returns void as $$
declare
    invalid_form_data text;
    missing_condition_data text;
    num_rows integer;
begin
raise notice 'set_wf_node_next_node_id: assigning initial next_node_id values';
with dummy_config_values as (
    select *
    from (
        values
            ('11111111-1111-1111-1111-111111111101'::uuid, 'Imported ProcessMaker task', 'task', 'imported_processmaker_dummy_task'),
            ('11111111-1111-1111-1111-111111111102'::uuid, 'Imported ProcessMaker form', 'form', 'imported_processmaker_dummy_form'),
            ('11111111-1111-1111-1111-111111111103'::uuid, 'Imported ProcessMaker document', 'document', 'imported_processmaker_dummy_document')
    ) as value(key, title, type, name)
),
upsert_dummy_configs as (
    insert into alma.wf_config (
        key,
        title,
        type,
        version,
        name,
        min_per_entity,
        max_per_entity,
        is_start_task,
        fields,
        is_optional
    )
    select
        key,
        title,
        type,
        1 as version,
        name,
        0 as min_per_entity,
        null as max_per_entity,
        case when type = 'task' then false end as is_start_task,
        case when type = 'form' then '[]'::jsonb end as fields,
        case when type in ('form', 'document') then false end as is_optional
    from dummy_config_values
    on conflict (key) do update
    set
        title = excluded.title,
        type = excluded.type,
        version = excluded.version,
        name = excluded.name,
        min_per_entity = excluded.min_per_entity,
        max_per_entity = excluded.max_per_entity,
        is_start_task = excluded.is_start_task,
        fields = excluded.fields,
        is_optional = excluded.is_optional
    returning wf_config_id, type
),
dummy_configs as (
    select wf_config_id, type
    from upsert_dummy_configs

    union

    select wf_config.wf_config_id, wf_config.type
    from alma.wf_config
    join dummy_config_values
        on dummy_config_values.key = wf_config.key
),
task_nodes as (
    select
        task_node.wf_node_id,
        task_node.parent_id as workflow_node_id,
        pm_cache_v.pm_cache_id,
        pm_cache_v.app_uid,
        pm_cache_v.del_index,
        pm_cache_v.pro_uid,
        pm_cache_v.tas_uid
    from alma.wf_node task_node
    join alma.wf_node workflow_node
        on workflow_node.wf_node_id = task_node.parent_id
        and workflow_node.type = 'workflow'
    join altlast.pm_cache_v
        on task_node.note ~ '^[0-9]+$'
        and pm_cache_v.pm_cache_id = task_node.note::integer
    where task_node.type = 'task'
),
form_nodes as (
    select
        form_node.wf_node_id,
        task_nodes.workflow_node_id,
        task_nodes.pm_cache_id,
        task_nodes.del_index,
        task_nodes.pro_uid,
        regexp_replace(form_node.title, ' \([0-9]+\)$', '') as title,
        row_number() over (
            partition by form_node.parent_id, regexp_replace(form_node.title, ' \([0-9]+\)$', '')
            order by form_node.wf_node_id
        ) as occurrence_no
    from alma.wf_node form_node
    join task_nodes
        on task_nodes.wf_node_id = form_node.parent_id
    where form_node.type = 'form'
),
forms_imported as (
    select
        forms_imported.pm_cache_id,
        forms_imported.title,
        forms_imported.tas_uid,
        forms_imported.step_uid,
        row_number() over (
            partition by forms_imported.pm_cache_id, forms_imported.title
            order by forms_imported.form_id
        ) as occurrence_no
    from wf_workflow.forms_imported
),
form_steps as (
    select
        form_nodes.wf_node_id,
        form_nodes.workflow_node_id,
        form_nodes.del_index,
        form_nodes.pro_uid,
        forms_imported.tas_uid,
        forms_imported.step_uid,
        step.step_position
    from form_nodes
    join forms_imported
        on forms_imported.pm_cache_id = form_nodes.pm_cache_id
        and forms_imported.title = form_nodes.title
        and forms_imported.occurrence_no = form_nodes.occurrence_no
    join wf_workflow.step
        on step.step_uid = forms_imported.step_uid
),
document_steps as (
    select distinct
        document_node.wf_node_id,
        task_nodes.workflow_node_id,
        task_nodes.del_index,
        task_nodes.pro_uid,
        task_nodes.tas_uid,
        step.step_uid,
        step.step_position
    from alma.wf_node document_node
    join task_nodes
        on task_nodes.wf_node_id = document_node.parent_id
    join wf_workflow.step
        on step.tas_uid = task_nodes.tas_uid
        and step.step_uid = document_node.created_by
    where document_node.type = 'document'
),
processmaker_nodes as (
    select
        task_nodes.wf_node_id,
        task_nodes.workflow_node_id,
        task_nodes.del_index,
        task_nodes.pro_uid,
        0 as step_position,
        task_nodes.tas_uid,
        null::varchar(32) as step_uid
    from task_nodes

    union all

    select
        form_steps.wf_node_id,
        form_steps.workflow_node_id,
        form_steps.del_index,
        form_steps.pro_uid,
        form_steps.step_position,
        form_steps.tas_uid,
        form_steps.step_uid
    from form_steps

    union all

    select
        document_steps.wf_node_id,
        document_steps.workflow_node_id,
        document_steps.del_index,
        document_steps.pro_uid,
        document_steps.step_position,
        document_steps.tas_uid,
        document_steps.step_uid
    from document_steps
),
matched_workflows as (
    -- Workflows whose (German-translated) title matches a wf_workflow.content PRO_TITLE entry.
    -- Used to gate the dummy-phase UPDATE so we only touch children of importable workflows.
    select distinct content.con_id as pro_uid
    from alma.wf_config workflow_config
    left join alma.translations
        on translations.msgid = workflow_config.title
        and translations.locale = 'de'
    join wf_workflow.content
        on content.con_category = 'PRO_TITLE'
        and content.con_lang = 'de'
        and content.con_value = coalesce(translations.msgstr, workflow_config.title)
    where workflow_config.type = 'workflow'
),
last_processmaker_node as (
    select distinct on (processmaker_nodes.workflow_node_id)
        processmaker_nodes.workflow_node_id,
        processmaker_nodes.wf_node_id as next_node_id
    from processmaker_nodes
    join matched_workflows
        on matched_workflows.pro_uid = processmaker_nodes.pro_uid
    order by
        processmaker_nodes.workflow_node_id,
        processmaker_nodes.del_index desc,
        processmaker_nodes.step_position desc,
        processmaker_nodes.tas_uid desc,
        processmaker_nodes.step_uid desc nulls first,
        processmaker_nodes.wf_node_id desc
),
workflow_children as (
    select
        task_nodes.wf_node_id,
        task_nodes.workflow_node_id,
        'task' as type
    from task_nodes

    union all

    select
        child_node.wf_node_id,
        task_nodes.workflow_node_id,
        child_node.type
    from alma.wf_node child_node
    join task_nodes
        on task_nodes.wf_node_id = child_node.parent_id
    where child_node.type in ('form', 'document')
),
workflow_child_targets as (
    select
        workflow_children.wf_node_id,
        workflow_children.type,
        case
            when workflow_children.wf_node_id = last_processmaker_node.next_node_id then null
            else last_processmaker_node.next_node_id
        end as next_node_id
    from workflow_children
    join last_processmaker_node
        on last_processmaker_node.workflow_node_id = workflow_children.workflow_node_id
)
update alma.wf_node target_node
set
    wf_config_id = dummy_configs.wf_config_id,
    version = 1,
    next_node_id = workflow_child_targets.next_node_id
from workflow_child_targets
join dummy_configs
    on dummy_configs.type = workflow_child_targets.type
where target_node.wf_node_id = workflow_child_targets.wf_node_id
    and (
        target_node.wf_config_id is distinct from dummy_configs.wf_config_id
        or target_node.version is distinct from 1
        or target_node.next_node_id is distinct from workflow_child_targets.next_node_id
    )
;

get diagnostics num_rows = row_count;
raise notice 'set_wf_node_next_node_id: assigned initial next_node_id values: % rows', num_rows;

raise notice 'set_wf_node_next_node_id: mapping real wf_config values';
with configured_workflows as (
    select
        wf_config.wf_config_id,
        coalesce(translations.msgstr, wf_config.title) as title
    from alma.wf_config
    left join alma.translations
        on translations.msgid = wf_config.title
        and translations.locale = 'de'
    where wf_config.type = 'workflow'
),
processmaker_workflows as (
    select
        configured_workflows.wf_config_id as workflow_config_id,
        content.con_id as pro_uid
    from configured_workflows
    join wf_workflow.content
        on content.con_category = 'PRO_TITLE'
        and content.con_lang = 'de'
        and content.con_value = configured_workflows.title
),
configured_node_configs as (
    select
        node_config.workflow_id,
        node_config.wf_config_id,
        node_config.type,
        translations.msgstr as title
    from alma.wf_config node_config
    join configured_workflows
        on configured_workflows.wf_config_id = node_config.workflow_id
    join alma.translations
        on translations.msgid = node_config.title
        and translations.locale = 'de'
    where node_config.type in ('task', 'form', 'document')
),
task_nodes as (
    select
        task_node.wf_node_id,
        task_node.title,
        task_node.parent_id as workflow_node_id,
        pm_cache_v.pm_cache_id,
        pm_cache_v.app_uid,
        pm_cache_v.del_index,
        pm_cache_v.pro_uid,
        pm_cache_v.tas_uid
    from alma.wf_node task_node
    join alma.wf_node workflow_node
        on workflow_node.wf_node_id = task_node.parent_id
        and workflow_node.type = 'workflow'
    join altlast.pm_cache_v
        on task_node.note ~ '^[0-9]+$'
        and pm_cache_v.pm_cache_id = task_node.note::integer
    where task_node.type = 'task'
),
configured_workflow_nodes as (
    select distinct on (task_nodes.workflow_node_id)
        task_nodes.workflow_node_id,
        processmaker_workflows.workflow_config_id
    from task_nodes
    join processmaker_workflows
        on processmaker_workflows.pro_uid = task_nodes.pro_uid
    order by
        task_nodes.workflow_node_id,
        task_nodes.del_index desc,
        task_nodes.pm_cache_id desc
),
form_nodes as (
    select
        form_node.wf_node_id,
        task_nodes.workflow_node_id,
        task_nodes.pm_cache_id,
        task_nodes.del_index,
        task_nodes.pro_uid,
        regexp_replace(form_node.title, ' \([0-9]+\)$', '') as title,
        row_number() over (
            partition by form_node.parent_id, regexp_replace(form_node.title, ' \([0-9]+\)$', '')
            order by form_node.wf_node_id
        ) as occurrence_no
    from alma.wf_node form_node
    join task_nodes
        on task_nodes.wf_node_id = form_node.parent_id
    where form_node.type = 'form'
),
forms_imported as (
    select
        forms_imported.pm_cache_id,
        forms_imported.title,
        forms_imported.tas_uid,
        forms_imported.step_uid,
        row_number() over (
            partition by forms_imported.pm_cache_id, forms_imported.title
            order by forms_imported.form_id
        ) as occurrence_no
    from wf_workflow.forms_imported
),
form_steps as (
    select
        form_nodes.wf_node_id,
        form_nodes.workflow_node_id,
        form_nodes.del_index,
        form_nodes.pro_uid,
        forms_imported.tas_uid,
        forms_imported.step_uid,
        step.step_position
    from form_nodes
    join forms_imported
        on forms_imported.pm_cache_id = form_nodes.pm_cache_id
        and forms_imported.title = form_nodes.title
        and forms_imported.occurrence_no = form_nodes.occurrence_no
    join wf_workflow.step
        on step.step_uid = forms_imported.step_uid
),
document_steps as (
    select distinct
        document_node.wf_node_id,
        task_nodes.workflow_node_id,
        task_nodes.del_index,
        task_nodes.pro_uid,
        task_nodes.tas_uid,
        step.step_uid,
        step.step_position
    from alma.wf_node document_node
    join task_nodes
        on task_nodes.wf_node_id = document_node.parent_id
    join wf_workflow.step
        on step.tas_uid = task_nodes.tas_uid
        and step.step_uid = document_node.created_by
    where document_node.type = 'document'
),
processmaker_nodes as (
    select
        task_nodes.wf_node_id,
        task_nodes.workflow_node_id,
        task_nodes.del_index,
        task_nodes.pro_uid,
        0 as step_position,
        task_nodes.tas_uid,
        null::varchar(32) as step_uid
    from task_nodes

    union all

    select
        form_steps.wf_node_id,
        form_steps.workflow_node_id,
        form_steps.del_index,
        form_steps.pro_uid,
        form_steps.step_position,
        form_steps.tas_uid,
        form_steps.step_uid
    from form_steps

    union all

    select
        document_steps.wf_node_id,
        document_steps.workflow_node_id,
        document_steps.del_index,
        document_steps.pro_uid,
        document_steps.step_position,
        document_steps.tas_uid,
        document_steps.step_uid
    from document_steps
),
last_relevant_processmaker_node as (
    select distinct on (
        processmaker_nodes.workflow_node_id,
        processmaker_workflows.workflow_config_id
    )
        processmaker_nodes.workflow_node_id,
        processmaker_nodes.wf_node_id,
        processmaker_workflows.workflow_config_id
    from processmaker_nodes
    join processmaker_workflows
        on processmaker_workflows.pro_uid = processmaker_nodes.pro_uid
    order by
        processmaker_nodes.workflow_node_id,
        processmaker_workflows.workflow_config_id,
        processmaker_nodes.del_index desc,
        processmaker_nodes.step_position desc,
        processmaker_nodes.tas_uid desc,
        processmaker_nodes.step_uid desc nulls first,
        processmaker_nodes.wf_node_id desc
),
workflow_targets as (
    select
        configured_workflow_nodes.workflow_node_id as wf_node_id,
        configured_workflow_nodes.workflow_config_id,
        last_relevant_processmaker_node.wf_node_id as next_node_id
    from configured_workflow_nodes
    join last_relevant_processmaker_node
        on last_relevant_processmaker_node.workflow_node_id = configured_workflow_nodes.workflow_node_id
        and last_relevant_processmaker_node.workflow_config_id = configured_workflow_nodes.workflow_config_id
),
target_nodes as (
    select
        last_relevant_processmaker_node.wf_node_id,
        last_relevant_processmaker_node.workflow_config_id,
        wf_node.type,
        wf_node.title,
        null::integer as next_node_id
    from last_relevant_processmaker_node
    join alma.wf_node
        on wf_node.wf_node_id = last_relevant_processmaker_node.wf_node_id

    union

    select
        task_node.wf_node_id,
        last_relevant_processmaker_node.workflow_config_id,
        task_node.type,
        task_node.title,
        task_node.next_node_id
    from last_relevant_processmaker_node
    join alma.wf_node last_node
        on last_node.wf_node_id = last_relevant_processmaker_node.wf_node_id
    join alma.wf_node task_node
        on task_node.wf_node_id = last_node.parent_id
        and task_node.type = 'task'
    where last_node.type in ('form', 'document')
),
updated_workflow_nodes as (
    update alma.wf_node workflow_node
    set
        wf_config_id = workflow_targets.workflow_config_id,
        version = 1,
        next_node_id = workflow_targets.next_node_id
    from workflow_targets
    where workflow_node.wf_node_id = workflow_targets.wf_node_id
        and workflow_node.type = 'workflow'
        and (
            workflow_node.wf_config_id is distinct from workflow_targets.workflow_config_id
            or workflow_node.version is distinct from 1
            or workflow_node.next_node_id is distinct from workflow_targets.next_node_id
        )
    returning workflow_node.wf_node_id
)
update alma.wf_node target_node
set
    wf_config_id = configured_node_configs.wf_config_id,
    version = 1,
    next_node_id = target_nodes.next_node_id
from target_nodes
join configured_node_configs
    on configured_node_configs.workflow_id = target_nodes.workflow_config_id
    and configured_node_configs.type = target_nodes.type
    and (
        (
            configured_node_configs.type in ('task', 'form')
            and configured_node_configs.title = regexp_replace(target_nodes.title, ' \([0-9]+\)$', '')
        )
        or
        (
            configured_node_configs.type = 'document'
            and (
                target_nodes.title = configured_node_configs.title
                or target_nodes.title like configured_node_configs.title || ':%'
            )
        )
    )
where target_node.wf_node_id = target_nodes.wf_node_id
    and (
        target_node.wf_config_id is distinct from configured_node_configs.wf_config_id
        or target_node.version is distinct from 1
        or target_node.next_node_id is distinct from target_nodes.next_node_id
    )
;

get diagnostics num_rows = row_count;
raise notice 'set_wf_node_next_node_id: mapped real wf_config values: % rows', num_rows;

raise notice 'set_wf_node_next_node_id: copying form_data into data for mapped forms';
with mapped_forms as (
    select
        form_node.wf_node_id,
        wf_config.name,
        form_node.form_config ->> 'name' as imported_name,
        coalesce(form_node.form_data, '{}'::jsonb) as form_data
    from alma.wf_node form_node
    join alma.wf_config
        on wf_config.wf_config_id = form_node.wf_config_id
        and wf_config.type = 'form'
        and wf_config.name is not null
    where form_node.type = 'form'
        and form_node.form_data is not null
        and wf_config.key not in (
            '11111111-1111-1111-1111-111111111102'::uuid
        )
),
form_data_by_node as (
    select
        mapped_forms.wf_node_id,
        mapped_forms.form_data,
        jsonb_set(
            coalesce(wf_node.form_config, '{}'::jsonb),
            '{name}',
            to_jsonb(mapped_forms.name),
            true
        ) as form_config,
        jsonb_build_object(
            'form',
            (
                case
                    when mapped_forms.imported_name is null then coalesce(wf_node.data -> 'form', '{}'::jsonb)
                    else coalesce(wf_node.data -> 'form', '{}'::jsonb) - mapped_forms.imported_name
                end
            )
            || jsonb_build_object(mapped_forms.name, mapped_forms.form_data)
        ) as data_patch
    from mapped_forms
    join alma.wf_node
        on wf_node.wf_node_id = mapped_forms.wf_node_id
)
update alma.wf_node
set
    form_data = form_data_by_node.form_data,
    form_config = form_data_by_node.form_config,
    data = coalesce(alma.wf_node.data, '{}'::jsonb) || form_data_by_node.data_patch
from form_data_by_node
where alma.wf_node.wf_node_id = form_data_by_node.wf_node_id
    and alma.wf_node.type = 'form'
    and (
        alma.wf_node.form_data is distinct from form_data_by_node.form_data
        or alma.wf_node.form_config is distinct from form_data_by_node.form_config
        or alma.wf_node.data is distinct from coalesce(alma.wf_node.data, '{}'::jsonb) || form_data_by_node.data_patch
    )
;

    get diagnostics num_rows = row_count;
    raise notice 'set_wf_node_next_node_id: copied form_data into data: % rows', num_rows;

    raise notice 'set_wf_node_next_node_id: validating form data against form_config';
    with imported_forms as (
        select
            wf_node_id,
            title,
            form_config,
            data
        from alma.wf_node
        where type = 'form'
            and jsonb_typeof(form_config -> 'fields') = 'array'
            and jsonb_typeof(data -> 'form') = 'object'
    ),
    configured_fields as (
        select
            imported_forms.wf_node_id,
            field_config ->> 'name' as field_name,
            field_config
        from imported_forms
        cross join lateral jsonb_array_elements(
            case
                when jsonb_typeof(imported_forms.form_config -> 'fields') = 'array'
                    then imported_forms.form_config -> 'fields'
                else '[]'::jsonb
            end
        ) as field_config
        where field_config ? 'name'
    ),
    form_data_fields as (
        select
            imported_forms.wf_node_id,
            imported_forms.title,
            imported_forms.form_config,
            imported_forms.data,
            form_data_object.key as form_name,
            form_data_field.key as field_name,
            form_data_field.value as field_value
        from imported_forms
        cross join lateral jsonb_each(imported_forms.data -> 'form') as form_data_object(key, value)
        cross join lateral jsonb_each(
            case
                when jsonb_typeof(form_data_object.value) = 'object'
                    then form_data_object.value
                else '{}'::jsonb
            end
        ) as form_data_field(key, value)
    ),
    unknown_fields as (
        select
            form_data_fields.wf_node_id,
            form_data_fields.title,
            form_data_fields.form_name,
            form_data_fields.field_name,
            form_data_fields.field_value,
            'missing field in form_config' as issue
        from form_data_fields
        left join configured_fields
            on configured_fields.wf_node_id = form_data_fields.wf_node_id
            and configured_fields.field_name = form_data_fields.field_name
        where configured_fields.wf_node_id is null
    ),
    invalid_choices as (
        select
            form_data_fields.wf_node_id,
            form_data_fields.title,
            form_data_fields.form_name,
            form_data_fields.field_name,
            form_data_fields.field_value,
            'invalid choice value' as issue
        from form_data_fields
        join configured_fields
            on configured_fields.wf_node_id = form_data_fields.wf_node_id
            and configured_fields.field_name = form_data_fields.field_name
        where jsonb_typeof(configured_fields.field_config -> 'choices') = 'array'
            and form_data_fields.field_value <> 'null'::jsonb
            and not exists (
                select 1
                from jsonb_array_elements(configured_fields.field_config -> 'choices') as choice_config
                where choice_config ->> 'value' = form_data_fields.field_value #>> '{}'
            )
    ),
    invalid_fields as (
        select *
        from unknown_fields

        union all

        select *
        from invalid_choices
    )
    select string_agg(
        format(
            '- wf_node_id: %s, title: %s, form: %s, field: %s, issue: %s, value: %s',
            wf_node_id,
            title,
            form_name,
            field_name,
            issue,
            field_value
        ),
        E'\n'
        order by wf_node_id, field_name, issue
    )
    into strict invalid_form_data
    from invalid_fields;

    if invalid_form_data is not null then
        raise exception
            E'Imported form node data does not match form_config:\n%',
            invalid_form_data;
    end if;

    raise notice 'set_wf_node_next_node_id: form data matches form_config';
    raise notice 'set_wf_node_next_node_id: validating workflow conditions against form data';
    with imported_mapped_tasks as (
        select
            task_node.wf_node_id,
            task_node.title,
            task_node.wf_config_id
        from alma.wf_node task_node
        join alma.wf_config task_config
            on task_config.wf_config_id = task_node.wf_config_id
            and task_config.type = 'task'
            and task_config.key != '11111111-1111-1111-1111-111111111101'::uuid
        where task_node.type = 'task'
            and task_node.note ~ '^[0-9]+$'
    ),
    task_conditions as (
        select
            imported_mapped_tasks.wf_node_id,
            imported_mapped_tasks.title,
            wf_link.condition #>> '{}' as condition
        from imported_mapped_tasks
        join alma.wf_link
            on wf_link.task_id = imported_mapped_tasks.wf_config_id
        where wf_link.condition is not null

        union all

        select
            imported_mapped_tasks.wf_node_id,
            imported_mapped_tasks.title,
            wf_step.condition #>> '{}' as condition
        from imported_mapped_tasks
        join alma.wf_step
            on wf_step.task_id = imported_mapped_tasks.wf_config_id
        where wf_step.condition is not null
    ),
    condition_references as (
        select
            task_conditions.wf_node_id,
            task_conditions.title,
            task_conditions.condition,
            condition_match[1] as form_name,
            condition_match[2] as field_name
        from task_conditions
        cross join lateral regexp_matches(
            task_conditions.condition,
            'form\.([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)',
            'g'
        ) as condition_match
    ),
    checked_references as (
        select
            form_node.wf_node_id,
            form_node.title,
            form_node.data,
            condition_references.condition,
            condition_references.form_name,
            condition_references.field_name,
            form_node.form_data ? condition_references.field_name as form_data_has_field,
            form_node.data -> 'form' -> condition_references.form_name ? condition_references.field_name as form_node_data_has_field
        from condition_references
        join alma.wf_node form_node
            on form_node.parent_id = condition_references.wf_node_id
            and form_node.type = 'form'
            and exists (
                select
                    1
                from alma.wf_config form_config
                where form_config.wf_config_id = form_node.wf_config_id
                    and form_config.type = 'form'
                    and form_config.name = condition_references.form_name
            )
    ),
    missing_references as (
        select distinct
            wf_node_id,
            title,
            data,
            condition
        from checked_references
        where not form_data_has_field
            or not form_node_data_has_field
    )
    select string_agg(
        format(
            '- wf_node_id: %s, title: %s, condition: %s, data: %s',
            wf_node_id,
            title,
            condition,
            data
        ),
        E'\n'
        order by wf_node_id
    )
    into strict missing_condition_data
    from missing_references;

    if missing_condition_data is not null then
        raise exception
            E'Imported workflow condition references missing fields on form nodes:\n%',
            missing_condition_data;
    end if;

    raise notice 'set_wf_node_next_node_id: workflow conditions match form data';

    raise notice 'The following translations did not match, recheck: %', (
        select string_agg(
            format(
                'title=%s, parent=%s, grand_parent=%s',
                unmatched.title,
                unmatched.parent,
                unmatched.grand_parent
            ),
            E'\n'
            order by unmatched.title, unmatched.parent, unmatched.grand_parent
        )
        from (
            select distinct
                coalesce(wn.title, '<null>') as title,
                coalesce(parent.title, '<null>') as parent,
                coalesce(grand_parent.title, '<null>') as grand_parent
            from alma.wf_node wn
            join alma.wf_node parent on wn.parent_id = parent.wf_node_id
            join alma.wf_config wc on wn.wf_config_id = wc.wf_config_id
            left join alma.wf_node grand_parent on parent.parent_id = grand_parent.wf_node_id
            where
                not exists (select 1 from alma.translations where msgstr = trim(wn.title))
                and wn.next_node_id is null
                and parent.next_node_id is not null
                and wc.title like 'Imported ProcessMaker%'
        ) unmatched
    );

    raise notice 'Removing counter suffix from wf_node titles';
    update alma.wf_node set title = regexp_replace(title, ' \([0-9]+\)$', '') where title ~ ' \([0-9]+\)$';

    raise notice 'Updating document node titles based on altlast.pm_doc';
    update alma.wf_node doc_node
        set title = coalesce(pd.app_doc_title, doc_node.title)
    from altlast.pm_doc pd
    where
        doc_node."type" = 'document'
        and coalesce(pd.app_doc_comment, '') = coalesce(doc_node.note, '')
        and pd.pm_doc_id::text = doc_node.updated_by
    ;
    raise notice 'Updated document node titles from altlast.pm_doc: % rows', num_rows;

    update alma.wf_node
        set updated_by = null
    where
        "type" in ('document');

end;
$$ language plpgsql;
