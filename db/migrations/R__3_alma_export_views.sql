drop view if exists alma_export.wfs_vflz_current_all_de_v;

create view alma_export.wfs_vflz_current_all_de_v as
select 
    vflz.vflz_id
    , vflz.vflz_combined_id_kt as Standortnummer
    , vflz.bezeichnung as Standortname
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_vftyp, vflz.c_vflz_vftyp), 'de') as Standorttyp
    , vflz.c_vflz_vftyp as code_vftyp
    , alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'de') as Beurteilung
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_unterstand, vflz.c_vflz_unterstand), 'de') as Untersuchungsstand
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_bearbstand, vflz.c_vflz_bearbstand), 'de') as Bearbeitungsstand
    , c_org_kuerzel as Vollzugsbehörde
    , vflz.zentroid as Koordinatenpunkt
    , cod_kbs_info.color
    , cod_kbs_info.color_rgb
    , vflgeo.wkb_geometry
from alma.vflz
    join alma.bere using (vflz_id)
    left join alma.cod_kbsinfo cod_kbs_info 
        on bere.h_bere_res_abwbewe = cod_kbs_info.h_bere_res_abwbewe 
        and bere.c_bere_res_abwbewe = cod_kbs_info.c_bere_res_abwbewe
    left join alma.vflgeo using (vflz_id)
where vflz.is_current
;

comment on view alma_export.wfs_vflz_current_all_de_v is 'View für den internen WMS und WFS Layer aller Standorte. Symbolisierung nach den MGDM Farben.';


drop view if exists alma_export.wfs_vflz_current_all_fr_v;

create view alma_export.wfs_vflz_current_all_fr_v as
select 
    vflz.vflz_id
    , vflz.vflz_combined_id_kt as Numero_du_site
    , vflz.bezeichnung as Nom_du_site
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_vftyp, vflz.c_vflz_vftyp), 'fr') as Type_de_site
    , vflz.c_vflz_vftyp as code_vftyp
    , alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'fr') as Evaluation
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_unterstand, vflz.c_vflz_unterstand), 'fr') as Etat_enquete
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_bearbstand, vflz.c_vflz_bearbstand), 'fr') as Etat_traitement
    , c_org_kuerzel as Autorite
    , vflz.zentroid as coordonnees
    , cod_kbs_info.color
    , cod_kbs_info.color_rgb
    , vflgeo.wkb_geometry
from alma.vflz
    join alma.bere using (vflz_id)
    left join alma.cod_kbsinfo cod_kbs_info 
        on bere.h_bere_res_abwbewe = cod_kbs_info.h_bere_res_abwbewe 
        and bere.c_bere_res_abwbewe = cod_kbs_info.c_bere_res_abwbewe
    left join alma.vflgeo using (vflz_id)
where vflz.is_current
;

comment on view alma_export.wfs_vflz_current_all_fr_v is 'View pour la couche WMS et WFS interne de tous les sites. Symbolisation selon les couleurs MGDM.';


drop view if exists alma_export.wfs_vflz_current_all_it_v;

create view alma_export.wfs_vflz_current_all_it_v as
select 
    vflz.vflz_id
    , vflz.vflz_combined_id_kt as Numero_di_Sito
    , vflz.bezeichnung as Denominazione
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_vftyp, vflz.c_vflz_vftyp), 'it') as Tipo_di_Sito
    , vflz.c_vflz_vftyp as code_vftyp
    , alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'it') as Valutazione
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_unterstand, vflz.c_vflz_unterstand), 'it') as Stato_indagine
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_bearbstand, vflz.c_vflz_bearbstand), 'it') as Stato_elaborazione
    , c_org_kuerzel as Autorita
    , vflz.zentroid as coordinate
    , cod_kbs_info.color
    , cod_kbs_info.color_rgb
    , vflgeo.wkb_geometry
from alma.vflz
    join alma.bere using (vflz_id)
    left join alma.cod_kbsinfo cod_kbs_info 
        on bere.h_bere_res_abwbewe = cod_kbs_info.h_bere_res_abwbewe 
        and bere.c_bere_res_abwbewe = cod_kbs_info.c_bere_res_abwbewe
    left join alma.vflgeo using (vflz_id)
where vflz.is_current
;

comment on view alma_export.wfs_vflz_current_all_it_v is 'Vista per il livello WMS e WFS interno di tutte le sedi. Simbolizzazione secondo i colori MGDM.';


      
    drop view if exists alma_export.wfs_vflz_ispublished_de_v;

create view alma_export.wfs_vflz_ispublished_de_v as
select 
    vflz.vflz_id
    , vflz.vflz_combined_id_kt as Standortnummer
    , vflz.bezeichnung as Standortname
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_vftyp, vflz.c_vflz_vftyp), 'de') as Standorttyp
    , alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'de') as Beurteilung
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_unterstand, vflz.c_vflz_unterstand), 'de') as Untersuchungsstand
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_bearbstand, vflz.c_vflz_bearbstand), 'de') as Bearbeitungsstand
    , c_org_kuerzel as Vollzugsbehörde
    , vflz.zentroid as Koordinatenpunkt
    , vipv.dat_latest_published as Publikationsdatum
    , cod_kbs_info.color
    , cod_kbs_info.color_rgb
    , vflgeo.wkb_geometry
from alma.vflz 
    join alma.vflz_is_published_v vipv on vipv.vflz_id = vflz.vflz_id and vipv.is_latest_published
    join alma.bere on bere.vflz_id = vflz.vflz_id
    left join alma.cod_kbsinfo cod_kbs_info 
        on bere.h_bere_res_abwbewe = cod_kbs_info.h_bere_res_abwbewe 
        and bere.c_bere_res_abwbewe = cod_kbs_info.c_bere_res_abwbewe
    left join alma.vflgeo on vflgeo.vflz_id = vflz.vflz_id
where vipv.is_latest_published 
;

comment on view alma_export.wfs_vflz_ispublished_de_v is 'View für den internen WMS und WFS Layer aller publizierten Standorte. Symbolisierung nach den MGDM Farben.';


drop view if exists alma_export.wfs_vflz_ispublished_fr_v;

create view alma_export.wfs_vflz_ispublished_fr_v as
select 
    vflz.vflz_id
    , vflz.vflz_combined_id_kt as Numero_du_site
    , vflz.bezeichnung as Nom_du_site
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_vftyp, vflz.c_vflz_vftyp), 'fr') as Type_de_site
    , alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'fr') as Evaluation
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_unterstand, vflz.c_vflz_unterstand), 'fr') as Etat_enquete
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_bearbstand, vflz.c_vflz_bearbstand), 'fr') as Etat_traitement
    , c_org_kuerzel as Autorite
    , vflz.zentroid as coordonnees
    , vipv.dat_latest_published as Date_publication
    , cod_kbs_info.color
    , cod_kbs_info.color_rgb
    , vflgeo.wkb_geometry
from alma.vflz 
    join alma.vflz_is_published_v vipv on vipv.vflz_id = vflz.vflz_id and vipv.is_latest_published
    join alma.bere on bere.vflz_id = vflz.vflz_id
    left join alma.cod_kbsinfo cod_kbs_info 
        on bere.h_bere_res_abwbewe = cod_kbs_info.h_bere_res_abwbewe 
        and bere.c_bere_res_abwbewe = cod_kbs_info.c_bere_res_abwbewe
    left join alma.vflgeo on vflgeo.vflz_id = vflz.vflz_id
where vipv.is_latest_published 
;

comment on view alma_export.wfs_vflz_ispublished_fr_v is 'View pour la couche WMS et WFS interne de tous les sites publiés. Symbolisation selon les couleurs MGDM.';


drop view if exists alma_export.wfs_vflz_ispublished_it_v;

create view alma_export.wfs_vflz_ispublished_it_v as
select 
    vflz.vflz_id
    , vflz.vflz_combined_id_kt as Numero_di_Sito
    , vflz.bezeichnung as Denominazione
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_vftyp, vflz.c_vflz_vftyp), 'it') as Tipo_di_Sito
    , alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'it') as Valutazione
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_unterstand, vflz.c_vflz_unterstand), 'it') as Stato_indagine
    , alma.translate_code(alma.msgid_code(vflz.h_vflz_bearbstand, vflz.c_vflz_bearbstand), 'it') as Stato_elaborazione
    , c_org_kuerzel as Autorita
    , vflz.zentroid as coordinate
    , vipv.dat_latest_published as Data_pubblicazione
    , cod_kbs_info.color
    , cod_kbs_info.color_rgb
    , vflgeo.wkb_geometry
from alma.vflz 
    join alma.vflz_is_published_v vipv on vipv.vflz_id = vflz.vflz_id and vipv.is_latest_published
    join alma.bere on bere.vflz_id = vflz.vflz_id
    left join alma.cod_kbsinfo cod_kbs_info 
        on bere.h_bere_res_abwbewe = cod_kbs_info.h_bere_res_abwbewe 
        and bere.c_bere_res_abwbewe = cod_kbs_info.c_bere_res_abwbewe
    left join alma.vflgeo on vflgeo.vflz_id = vflz.vflz_id
where vipv.is_latest_published 
;

comment on view alma_export.wfs_vflz_ispublished_it_v is 'Visualizzazione per il livello WMS e WFS interno di tutte le località pubblicate. Simbolizzazione secondo i colori MGDM.';


drop view if exists alma_export.report_grunddaten_v cascade;
 
create view alma_export.report_grunddaten_v as
 select v.vflz_id,
    lang.language,
    v.vflz_combined_id_kt,
    v.bezeichnung,
    case
        when ((alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), (lang.language)::text)
    end as standorttyp,
    v.h_gem_id,
    st_x(v.zentroid) as x_koordinate,
    st_y(v.zentroid) as y_koordinate,
    case
        when btrim(coalesce(bb.bem, ''::text)) = ''::text then '-'::text
        else bb.bem
    end as bemerkungen,
    v.vflz_flurname,
    v.vflz_strasse,
    v.vflz_postleitzahl,
    v.vflz_ort,
    v.h_vflz_bearbstand,
    v.c_vflz_bearbstand,
    v.h_vflz_vftyp,
    v.c_vflz_vftyp,
    v.h_vflz_gws_bereich,
    v.c_vflz_gws_bereich,
    v.h_vflz_gws_zone, 
    v.c_vflz_gws_zone,
    v.h_vflz_karstgeb,
    v.c_vflz_karstgeb,
    v.h_vflz_durchlaessigkeit,
    v.c_vflz_durchlaessigkeit,
    c_org_kuerzel as owner_org,
    hg.gemeinde,
    hg.c_kanton,
    v.rechtskraft,
    case
        when btrim(coalesce(to_char(v.dat_rechtskraft, 'DD.MM.YYYY')::text, ''::text)) = ''::text then '-'::text
        else to_char(v.dat_rechtskraft, 'DD.MM.YYYY')::text
    end as dat_rechtskraft,
    v.publizieren,
    case
        when btrim(coalesce(to_char(vps.dat_publizieren, 'DD.MM.YYYY')::text, ''::text)) = ''::text then '-'::text
        else to_char(vps.dat_publizieren, 'DD.MM.YYYY')::text
    end as dat_publizieren,
    case
        when ((alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), (lang.language)::text)
    end as beurteilung,
    case
        when ((alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), (lang.language)::text)
    end as untersuchungsstand,
    case
        when ((alma.translate_code(alma.msgid_code(bere.h_bere_prio_untersuch, bere.c_bere_prio_untersuch), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(bere.h_bere_prio_untersuch, bere.c_bere_prio_untersuch), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(bere.h_bere_prio_untersuch, bere.c_bere_prio_untersuch), (lang.language)::text)
    end as prio_untersuch,
    case
        when ((alma.translate_code(alma.msgid_code(bere.h_bere_prio_sanier, bere.c_bere_prio_sanier), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(bere.h_bere_prio_sanier, bere.c_bere_prio_sanier), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(bere.h_bere_prio_sanier, bere.c_bere_prio_sanier), (lang.language)::text)
    end as prio_sanier,
    case
        when ((alma.translate_code(alma.msgid_code(10104, bere.c_bere_res_abwbewe), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(10104, bere.c_bere_res_abwbewe), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(10104, bere.c_bere_res_abwbewe), (lang.language)::text)
    end as rechtlicher_bezug,
    case
        when ((alma.translate_code(alma.msgid_code(10105, bere.c_bere_res_abwbewe), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(10105, bere.c_bere_res_abwbewe), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(10105, bere.c_bere_res_abwbewe), (lang.language)::text)
    end as handlungsbedarf,
    case
        when btrim(coalesce((begr.bem)::text, ''::text)) = ''::text then '-'::text
        else (begr.bem)::text
    end as begruendung,
    case
        when btrim(coalesce((begr_prio.bem)::text, ''::text)) = ''::text then '-'::text
        else (begr_prio.bem)::text
    end as begr_prio,
    case
        when alma.translate_code(alma.msgid_code(v.h_org_kuerzel, v.c_org_kuerzel), (lang.language)::text) is null 
        or (alma.translate_code(alma.msgid_code(v.h_org_kuerzel, v.c_org_kuerzel), (lang.language)::text) = '') then '-'
        else alma.translate_code(alma.msgid_code(v.h_org_kuerzel, v.c_org_kuerzel), (lang.language)::text)
    end as amt,
    to_char(v.zeitraum_von, 'DD.MM.YYYY')::text as zeitraum_von,
    concat(
        case
            when ((date_part('year'::text, v.zeitraum_von))::text is null) and lang.language = 'de' then 'unbekannt'::text
            when ((date_part('year'::text, v.zeitraum_von))::text is null) and lang.language = 'fr' then 'inconnu'::text
            when ((date_part('year'::text, v.zeitraum_von))::text is null) and lang.language = 'it' then 'sconosciuto'::text
            else (date_part('year'::text, v.zeitraum_von))::text
        end, ' - ',
        case
            when v.zeitraum_bisheute and lang.language = 'de' then 'bis heute'::text
            when v.zeitraum_bisheute and lang.language = 'fr' then 'jusqu''à aujourd''hui'::text
            when v.zeitraum_bisheute and lang.language = 'it' then 'Attivo fino ad oggi'::text
            else (date_part('year'::text, v.zeitraum_bis))::text
        end) as zeitraum,
    case
        when v.flugplatz_id is not null then alma.translate_code(alma.msgid_code(flugplatz.h_flugplatz_bezeichnung, flugplatz.c_flugplatz_bezeichnung), (lang.language)::text)
        else null
    end as flugplatz,
    case
        when v.ktu_id is not null then alma.translate_code(alma.msgid_code(ktu.h_ktu, ktu.c_ktu), (lang.language)::text)
        else null
    end as ktu
    from ((((alma.vflz v
    left join alma.h_gem hg on ((v.h_gem_id = hg.h_gem_id)))
    left join alma.bere bere on ((bere.vflz_id = v.vflz_id))
    left join alma.flugplatz flugplatz using (flugplatz_id)
    left join alma.ktu ktu using (ktu_id)
    left join alma.vflz_publication_status_v vps on vps.vfl_id = v.vfl_id
    left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on ((bemgr.bemgrp_id = bem.bemgrp_id))
        where ((bemgr.bemgrp)::text ~~ 'standort'::text)) bb on ((bb.key_value = v.vflz_id)))
    left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on ((bemgr.bemgrp_id = bem.bemgrp_id))
        where ((bemgr.bemgrp)::text ~~ 'bere_begr_abwbewe'::text)) begr on ((begr.key_value = v.vflz_id)))
    left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on ((bemgr.bemgrp_id = bem.bemgrp_id))
        where ((bemgr.bemgrp)::text ~~ 'bere_begr_prio_untersuch'::text)) begr_prio on ((begr.key_value = v.vflz_id)))

    cross join ( select translations.locale as language
        from alma.translations
        group by translations.locale) lang;

comment on view alma_export.report_grunddaten_v is 'Grunddaten eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_umweltdaten_v;

create view alma_export.report_umweltdaten_v as
 select vflz.vflz_id,
    lang.language,
        case
            when ((alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_gws_bereich, 10017), vflz.c_vflz_gws_bereich), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_gws_bereich, 10017), vflz.c_vflz_gws_bereich), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_gws_bereich, 10017), vflz.c_vflz_gws_bereich), (lang.language)::text)
        end as gwsbereich,
        case
            when ((alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_gws_zone, 10018), vflz.c_vflz_gws_zone), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_gws_zone, 10018), vflz.c_vflz_gws_zone), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_gws_zone, 10018), vflz.c_vflz_gws_zone), (lang.language)::text)
        end as gwszone,
        case
            when ((alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_karstgeb, 80), vflz.c_vflz_karstgeb), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_karstgeb, 80), vflz.c_vflz_karstgeb), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_karstgeb, 80), vflz.c_vflz_karstgeb), (lang.language)::text)
        end as karstgebiet,
        case
            when ((alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_durchlaessigkeit, 58), vflz.c_vflz_durchlaessigkeit), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_durchlaessigkeit, 58), vflz.c_vflz_durchlaessigkeit), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(coalesce(vflz.h_vflz_durchlaessigkeit, 58), vflz.c_vflz_durchlaessigkeit), (lang.language)::text)
        end as durchlaessigkeit,
        case
            when ((alma.translate_code(alma.msgid_code(gwas.h_gwas_relzugw, gwas.c_gwas_relzugw), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(gwas.h_gwas_relzugw, gwas.c_gwas_relzugw), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(gwas.h_gwas_relzugw, gwas.c_gwas_relzugw), (lang.language)::text)
        end as relzugw,
        case
            when ((gwas.gwas_flurabstand)::text is null) then '-'::text
            else (gwas.gwas_flurabstand)::text
        end as flurabstand,
        case
            when ((gwas.gwas_distanz)::text is null) then '-'::text
            else (gwas.gwas_distanz)::text
        end as gwas_distanz,
        case
            when ((alma.translate_code(alma.msgid_code(gwas.h_gwas_nutzung, gwas.c_gwas_nutzung), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(gwas.h_gwas_nutzung, gwas.c_gwas_nutzung), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(gwas.h_gwas_nutzung, gwas.c_gwas_nutzung), (lang.language)::text)
        end as gwas_nutzung,
        case
            when ((ogw.ogw_name is null) or ((ogw.ogw_name)::text = ''::text)) then '-'::character varying
            else ogw.ogw_name
        end as ogw_name,
        case
            when ((alma.translate_code(alma.msgid_code(ogw.h_ogw_art_gewaesser, ogw.c_ogw_art_gewaesser::text), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(ogw.h_ogw_art_gewaesser, ogw.c_ogw_art_gewaesser::text), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(ogw.h_ogw_art_gewaesser, ogw.c_ogw_art_gewaesser::text), (lang.language)::text)
        end as ogw_art_gewaesser,
        case
            when ((alma.translate_code(alma.msgid_code(ogw.h_ogw_bau_gewaesser, ogw.c_ogw_bau_gewaesser::text), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(ogw.h_ogw_bau_gewaesser, ogw.c_ogw_bau_gewaesser::text), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(ogw.h_ogw_bau_gewaesser, ogw.c_ogw_bau_gewaesser::text), (lang.language)::text)
        end as ogw_bau_gewaesser,
        case
            when ((ogw.ogw_distanz)::text is null) then '-'::text
            else (ogw.ogw_distanz)::text
        end as ogw_distanz,
        case
            when ((alma.translate_code(alma.msgid_code(ogw.h_ogw_rellage, c_ogw_rellage), (lang.language)::text) is null) 
                or (alma.translate_code(alma.msgid_code(ogw.h_ogw_rellage, c_ogw_rellage), (lang.language)::text) = ''::text)) then '-'::text
            else alma.translate_code(alma.msgid_code(ogw.h_ogw_rellage, c_ogw_rellage), (lang.language)::text)
        end as ogw_rellage,
        case
            when (bem_umw.bem is null) then '-'::character varying
            else bem_umw.bem
        end as bem
   from (((alma.vflz
     left join alma.gwas on ((gwas.vflz_id = vflz.vflz_id)))
     left join alma.ogw on ((ogw.vflz_id = vflz.vflz_id))
     left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on ((bemgr.bemgrp_id = bem.bemgrp_id))
        where ((bemgr.bemgrp)::text ~~ 'umwelt'::text)) bem_umw on ((bem_umw.key_value = vflz.vflz_id)))
     cross join ( select translations.locale as language
           from alma.translations
          group by translations.locale) lang)
  group by vflz.vflz_id, lang.language, vflz.h_vflz_gws_bereich, vflz.c_vflz_gws_bereich, vflz.h_vflz_gws_zone, vflz.c_vflz_gws_zone, vflz.h_vflz_karstgeb, 
    vflz.c_vflz_karstgeb, vflz.h_vflz_durchlaessigkeit, vflz.c_vflz_durchlaessigkeit, gwas.h_gwas_relzugw, gwas.c_gwas_relzugw, gwas.gwas_distanz, gwas.h_gwas_nutzung, 
    gwas.c_gwas_nutzung, ogw.ogw_name, ogw.ogw_distanz, ogw.h_ogw_art_gewaesser, ogw.c_ogw_art_gewaesser, ogw.h_ogw_bau_gewaesser, ogw.c_ogw_bau_gewaesser, gwas.gwas_flurabstand, ogw.h_ogw_rellage, ogw.c_ogw_rellage, bem_umw.bem;

comment on view alma_export.report_umweltdaten_v is 'Umweltdaten eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_inta_v;

create view alma_export.report_inta_v as
    select inta.vflz_id,
        lang.language,
        inta.inta_id,
        inta.inta_vol_kompartiment,
        concat(
        case
            when ((date_part('year'::text, inta.inta_ablag_von))::text is null) and lang.language = 'de' then 'unbekannt'::text
            when ((date_part('year'::text, inta.inta_ablag_von))::text is null) and lang.language = 'fr' then 'inconnu'::text
            when ((date_part('year'::text, inta.inta_ablag_von))::text is null) and lang.language = 'it' then 'sconosciuto'::text
            else (date_part('year'::text, inta.inta_ablag_von))::text
        end, ' - ',
        case
            when inta.zeitraum_bisheute and lang.language = 'de' then 'bis heute'::text
            when inta.zeitraum_bisheute and lang.language = 'fr' then 'jusqu''à aujourd''hui'::text
            when inta.zeitraum_bisheute and lang.language = 'it' then 'Attivo fino ad oggi'::text
            else (date_part('year'::text, inta.inta_ablag_bis))::text
        end) as ablag_zeitraum,
        case
            when (bem.bem is null) then '-'::character varying
            else bem.bem
        end as bem
    from ((alma.inta
        left join alma.bem on (bem.key_value = inta.inta_id) and bem.bemgrp_id = 3)
        cross join ( select translations.locale as language
            from alma.translations
            group by translations.locale) lang)
    order by inta.vflz_id;

comment on view alma_export.report_inta_v is 'Ablagerungsdaten eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_kksk_v;

create view alma_export.report_kksk_v as
    select inta.vflz_id,
    inta.inta_id as kksk_inta_id,
    lang.language,     
    case
        when (kksk.kksk_teilvol = (0)::double precision) and lang.language = 'de' then 'unbekannt'::text
        when (kksk.kksk_teilvol = (0)::double precision) and lang.language = 'fr' then 'inconnu'::text
        when (kksk.kksk_teilvol = (0)::double precision) and lang.language = 'it' then 'sconosciuto'::text
        when ((kksk.kksk_teilvol)::text is null) then '-'::text
        else (kksk.kksk_teilvol)::text
    end as kksk_teilvol,
    case
        when (kksk.c_kksk_stoffkl is null) then '-'::text
        else alma.translate_code(alma.msgid_code(kksk.h_kksk_stoffkl, kksk.c_kksk_stoffkl), (lang.language)::text)
    end as stoffklasse,
    case
        when (kksk.kksk_ablag_von::text is null) and lang.language = 'de' then 'unbekannt'::text
        when (kksk.kksk_ablag_von::text is null) and lang.language = 'fr' then 'inconnu'::text
        when (kksk.kksk_ablag_von::text is null) and lang.language = 'it' then 'sconosciuto'::text
        else to_char(kksk.kksk_ablag_von, 'DD.MM.YYYY')::text
    end as kksk_von,
    case
        when kksk.zeitraum_bisheute and lang.language = 'de' then 'bis heute'::text
        when kksk.zeitraum_bisheute and lang.language = 'fr' then 'jusqu''à aujourd''hui'::text
        when kksk.zeitraum_bisheute and lang.language = 'it' then 'Attivo fino ad oggi'::text
        else to_char(kksk.kksk_ablag_bis, 'DD.MM.YYYY')::text
    end as kksk_bis
    from (alma.kksk
    JOIN alma.inta inta ON ((kksk.inta_id = inta.inta_id))
    cross join ( select translations.locale as language
        from alma.translations
        group by translations.locale) lang)
    order by inta.vflz_id;

comment on view alma_export.report_kksk_v is 'Ablagerungsdaten eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_intb_v;

create view alma_export.report_intb_v as
    select intb.vflz_id,
        intb.intb_id,
        lang.language,
        intb.relevant,
        case
            when (intb.intb_firma_name is null) then '-'::character varying
            else intb.intb_firma_name
        end as intb_firma_name,
        case
            when ((alma.translate_code(alma.msgid_code(intb.h_intb_bran, intb.c_intb_bran),(lang.language)::text)) is null) then '-'::text
            else (alma.translate_code(alma.msgid_code(intb.h_intb_bran, intb.c_intb_bran), (lang.language)::text))
        end as intb_bran_bezeichnung,
    concat(
        case
            when ((date_part('year'::text, intb.intb_vonbetrieb))::text is null) and lang.language = 'de' then 'unbekannt'::text
            when ((date_part('year'::text, intb.intb_vonbetrieb))::text is null) and lang.language = 'fr' then 'inconnu'::text
            when ((date_part('year'::text, intb.intb_vonbetrieb))::text is null) and lang.language = 'it' then 'sconosciuto'::text
            else (date_part('year'::text, intb.intb_vonbetrieb))::text
        end, ' - ',
        case
            when intb.zeitraum_bisheute and lang.language = 'de' then 'bis heute'::text
            when intb.zeitraum_bisheute and lang.language = 'fr' then 'jusqu''à aujourd''hui'::text
            when intb.zeitraum_bisheute and lang.language = 'it' then 'Attivo fino ad oggi'::text
            else (date_part('year'::text, intb.intb_bisbetrieb))::text
        end) as betrieb_zeitraum,
        case
            when (bem.bem is null) then '-'::character varying
            else bem.bem
        end as bem
    from ((alma.intb
        left join alma.bem on (bem.key_value = intb.intb_id) and bem.bemgrp_id = 2)
        cross join ( select translations.locale as language
            from alma.translations
            group by translations.locale) lang)
    order by intb.vflz_id;

comment on view alma_export.report_intb_v is 'Betriebsdaten eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_intu_v;

create view alma_export.report_intu_v as
    select intu.vflz_id,
        lang.language,
        intu.intu_id,
        intu.intu_name,
        to_char(intu.intu_unfallvon, 'DD.MM.YYYY')::text as intu_unfallvon,
    case
        when (bem.bem is null) then '-'::character varying
        else bem.bem
    end as bem
    from ((alma.intu
        left join alma.bem on (bem.key_value = intu.intu_id) and bem.bemgrp_id = 4)
        cross join ( select translations.locale as language
            from alma.translations
            group by translations.locale) lang)
    order by intu.vflz_id;

comment on view alma_export.report_intu_v is 'Unfalldaten eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_inum_v;

create view alma_export.report_inum_v as
    select inum.inum_id,
        intu.vflz_id,
        intu.intu_id as inum_intu_id,
        lang.language,
        case
            when (inum.c_inum_stoffe is null) then '-'::text
            else alma.translate_code(alma.msgid_code(inum.h_inum_stoffe, inum.c_inum_stoffe), (lang.language)::text)
        end as intu_stoffe,
        case
            when ((inum.inum_ausgelaufen)::text is null) then '-'::text
            else (inum.inum_ausgelaufen)::text
        end as inum_ausgelaufen,
        case
            when ((inum.inum_zurueckgewonnen)::text is null) then '-'::text
            else (inum.inum_zurueckgewonnen)::text
        end as inum_zurueckgewonnen,
        case
            when ((inum.inum_stoffmng)::text is null) then '-'::text
            else (inum.inum_stoffmng)::text
        end as inum_stoffmng
    from ((alma.intu
    join alma.inum on ((intu.intu_id = inum.intu_id)))
    cross join ( select translations.locale as language
        from alma.translations
        group by translations.locale) lang)
    order by intu.vflz_id;

comment on view alma_export.report_inum_v is 'Stoffdaten zum Unfall eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_vfus_v;

create view alma_export.report_vfus_v as
 select vfus.vflz_id,
    vfus.vfus_id,
    lang.language,
    alma.msgid_code(coalesce(vfus.h_vfus_art_schaden, 101), vfus.c_vfus_art_schaden) as vfus_art_schaden_msgid,
        case
            when (vfus.c_vfus_art_schaden is null) then '-'::text
            else alma.translate_code(alma.msgid_code(coalesce(vfus.h_vfus_art_schaden, 101), vfus.c_vfus_art_schaden), (lang.language)::text)
        end as vfus_art_schaden,
        case
            when (vfus.c_vfus_schaeden is null) then '-'::text
            else alma.translate_code(alma.msgid_code(vfus.h_vfus_schaeden, vfus.c_vfus_schaeden), (lang.language)::text)
        end as vfus_schaeden,
        case
            when (bem.bem is null) then '-'::character varying
            else bem.bem
        end as bem
   from ((alma.vfus
     left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on (bemgr.bemgrp_id = bem.bemgrp_id)
        where (bemgr.bemgrp)::text = 'vfus.vfus_id'::text) bem on (bem.key_value = vfus.vfus_id))
     cross join ( select translations.locale as language
           from alma.translations
          group by translations.locale) lang)
  order by vfus.vflz_id;

comment on view alma_export.report_vfus_v is 'Umweltschäden eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_veen_v;

create view alma_export.report_veen_v as
 select veen.vflz_id,
    veen.veen_id,
    lang.language,
    to_char(veen.veen_datum, 'DD.MM.YYYY')::text as veen_datum,
        case
            when (veen.c_veen_natuerlich is null) then '-'::text
            else alma.translate_code(alma.msgid_code(veen.h_veen_natuerlich, veen.c_veen_natuerlich), (lang.language)::text)
        end as veen_natuerlich,
        case
            when (bem.bem is null) then '-'::character varying
            else bem.bem
        end as bem
   from ((alma.veen
    left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on (bemgr.bemgrp_id = bem.bemgrp_id)
        where (bemgr.bemgrp)::text = 'veen.veen_id'::text) bem on (bem.key_value = veen.veen_id))
    cross join ( select translations.locale as language
           from alma.translations
          group by translations.locale) lang);

comment on view alma_export.report_veen_v is 'Einzelereignisse eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_saniziel_v;

create view alma_export.report_saniziel_v as
 select bere.vflz_id,
    sani.sani_id,
    lang.language,
        case
            when (sani.c_saniziel is null) then '-'::text
            else alma.translate_code(alma.msgid_code(sani.h_saniziel, sani.c_saniziel), (lang.language)::text)
        end as saniziel,
        case
            when (bem.bem is null) then '-'::character varying
            else bem.bem
        end as bem
   from ((alma.bere
     left join alma.sani on ((sani.vflz_id = bere.vflz_id)))
     left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on (bemgr.bemgrp_id = bem.bemgrp_id)
        where (bemgr.bemgrp)::text = 'sani.sani_id'::text) bem on (bem.key_value = sani.sani_id)
     cross join ( select translations.locale as language
           from alma.translations
          group by translations.locale) lang)
  where ((sani.h_saniziel is not null) or (sani.c_saniziel is not null) or (bem.bem is not null));

comment on view alma_export.report_saniziel_v is 'Sanierungsziele eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_massnahme_v;

create view alma_export.report_massnahme_v as
 select mass.vflz_id,
    mass.mass_id,
    lang.language,
        case
            when (mass.c_massnahme is null) then '-'::text
            else alma.translate_code(alma.msgid_code(mass.h_massnahme, mass.c_massnahme), (lang.language)::text)
        end as massnahme,
    case
        when btrim(coalesce(to_char(mass.dat_massnahme, 'DD.MM.YYYY')::text, ''::text)) = ''::text then '-'::text
        else to_char(mass.dat_massnahme, 'DD.MM.YYYY')::text
    end as dat_massnahme,
    to_char(mass.ang_massnahme, 'DD.MM.YYYY')::text as ang_massnahme,
        case
            when (bem.bem is null) then '-'::character varying
            else bem.bem
        end as bem
   from ((alma.mass
    left join ( select bem.bem, bem.key_value
        from alma.bem
        join alma.bemgrp bemgr on (bemgr.bemgrp_id = bem.bemgrp_id)
        where (bemgr.bemgrp)::text = 'mass.mass_id'::text) bem on (bem.key_value = mass.mass_id))
    cross join ( select translations.locale as language
           from alma.translations
          group by translations.locale) lang);

comment on view alma_export.report_massnahme_v is 'Massnahmen eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_nubo_v;

create view alma_export.report_nubo_v as
 select nubo.vflz_id,
    lang.language,
        case
            when (nubo.c_nubo_nutzungsart is null) then '-'::text
            else alma.translate_code(alma.msgid_code(coalesce(nubo.h_nubo_nutzungsart, 87), nubo.c_nubo_nutzungsart), (lang.language)::text)
        end as nubo_nutzungsart,
        case
            when (nubo.c_nubo_akt_nutzung is null) then '-'::text
            when ((nubo.c_nubo_akt_nutzung)::text = '-1'::text) then '-'::text
            else alma.translate_code(alma.msgid_code(nubo.h_nubo_akt_nutzung, nubo.c_nubo_akt_nutzung), (lang.language)::text)
        end as nubo_akt_nutzung
   from (alma.nubo
     cross join ( select translations.locale as language
           from alma.translations
          group by translations.locale) lang);

comment on view alma_export.report_nubo_v is 'Daten zu Nutzungen Gelände eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_sanierbere_v;

create view alma_export.report_sanierbere_v as
 select bere.vflz_id,
    lang.language,
        case
            when ((bere.c_bere_prio_sanier)::text is null) then '-'::text
            else (bere.c_bere_prio_sanier)::text
        end as bere_prio_sanier,
        case
            when (bem_begr_prio_sanier.bem is null) then '-'::character varying
            else bem_begr_prio_sanier.bem
        end as bem
   from (alma.bere
     left join alma.bem bem_abwbewe on (bem_abwbewe.key_value = bere.vflz_id) 
     join alma.bemgrp bemgr_abwbewe on (bemgr_abwbewe.bemgrp_id = bem_abwbewe.bemgrp_id) and ((bemgr_abwbewe.bemgrp)::text = 'bere_begr_abwbewe'::text)
     left join alma.bem bem_begr_prio_sanier on (bem_begr_prio_sanier.key_value = bere.vflz_id) 
     join alma.bemgrp bemgr_begr_prio_sanier on (bemgr_begr_prio_sanier.bemgrp_id = bem_begr_prio_sanier.bemgrp_id) and ((bemgr_begr_prio_sanier.bemgrp)::text = 'bere_begr_prio_sanier'::text)
     cross join ( select translations.locale as language
           from alma.translations
          group by translations.locale) lang)
  where ((bere.c_bere_prio_sanier is not null) or (bem_begr_prio_sanier.bem is not null));

comment on view alma_export.report_sanierbere_v is 'Sanierungen eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.interlis_cod_mapping_v cascade;

create view alma_export.interlis_cod_mapping_v as
 select cm.ili_code,
    cm.ili_c_cli_id,
    cm.code,
    cm.c_cli_id,
    cl.code_long
   from (alma_export.interlis_cod_mapping cm
     join alma_export.interlis_cod_long cl on (((cl.c_cli_id = cm.ili_c_cli_id) and ((cl.code)::text = (cm.ili_code)::text))));
     
comment on view alma_export.interlis_cod_mapping_v is 'INTERLIS Code Mapping zwischen Beurteilung und AltlStatus';


drop view if exists alma_export.vflz_filename_v;

create view alma_export.vflz_filename_v as
select
    vflz_id,
    vflz_combined_id_kt,
    rtrim(((select s.msgstr
            from translations s
            where s.msgid::text = 'interlis_settings.url_katasterauszug'::text and s.locale::text = 'de'::text))::text, '/'::text) || '/'::text as baseurl,
    case
        when (((select s.msgstr
                from translations s
                where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text) = any (array['kbs_sz_'::character varying::text, 'kbs_ur_'::character varying::text, 'kbs_zg_'::character varying::text])
        then (coalesce(((select s.msgstr
                        from translations s
                        where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text, ''::text) ||
              regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(vflz_combined_id_kt::text, '[äüöäüö]'::text, '_'::text, 'g'::text), '[\^w]'::text, '_'::text, 'g'::text), '__'::text, '_'::text, 'g'::text), '\s+'::text, '_'::text, 'g'::text), '/'::text, '_'::text, 'g'::text), '-'::text, '_'::text, 'g'::text)) || '.pdf'::text
        when (((select s.msgstr
                from translations s
                where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text) = 'kbs_bazl_'::text
        then (coalesce(((select s.msgstr
                        from translations s
                        where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text, ''::text) ||
              regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(regexp_replace(vflz_combined_id_kt::text, '[äüöäüö]'::text, '_'::text, 'g'::text), '[\^w]'::text, '_'::text, 'g'::text), '__'::text, '_'::text, 'g'::text), '\s+'::text, '_'::text, 'g'::text), '/'::text, '_'::text, 'g'::text), '-'::text, '_'::text, 'g'::text)) || '.pdf'::text
        when (((select s.msgstr
                from translations s
                where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text) = any (array['kbs_ag_'::character varying::text, 'kbs_fl_'::character varying::text])
        then vflz_combined_id_kt::text || '.pdf'::text
        when (((select s.msgstr
                from translations s
                where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text) = any (array['kbs_demo_'::character varying::text])
        then (coalesce(((select s.msgstr
                        from translations s
                        where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text, ''::text) || vflz_combined_id_kt::text) || '.pdf'::text
        else (coalesce(((select s.msgstr
                        from translations s
                        where s.msgid::text = 'interlis_settings.prefix_katasterauszug'::text and s.locale::text = 'de'::text))::text, ''::text) ||
              regexp_replace(vflz_combined_id_kt::text, '[^\w]'::text, '_'::text, 'g'::text)) || '.pdf'::text
    end as filename
from vflz
;

comment on view alma_export.vflz_filename_v is 'Dateinamen der öffentlichen KbS Datenblätter. Verwendet bei der Generierung der Datenblätter und der Verlinkung in den INTERLIS Exporten.';


drop view if exists alma_export.interlis_task_mapping_v;

create view alma_export.interlis_task_mapping_v as
    select cm.ili_code,
        cm.ili_c_cli_id,
        cm.pro_uid,
        cm.tas_uid,
        cl.code_long,
        cm.a4w_code
    from alma_export.interlis_task_mapping cm
    join alma_export.interlis_cod_long cl on (cl.c_cli_id = cm.ili_c_cli_id) and ((cl.code)::text = (cm.ili_code)::text)
;

comment on view alma_export.interlis_task_mapping_v is 'Mapping der Codes zu Prozessen. Wird nur verwendet wenn der Untersuchungsstand in den INTERLIS Exporten aus den Geschäften abgeleitet wird.';


drop view if exists alma_export.report_workflows_v;
create view alma_export.report_workflows_v as
     select vflz.vflz_id,
 		vflz.vfl_id,
        lang.language,
        case
            when wf_node.title is null then '-'
            when translations.msgstr is null then wf_node.title
            else translations.msgstr
        end as title,
        case 
            when wf_node.type is null then '-'
            else wf_node.type
        end as type,
        case 
            when alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%ericht%' 
            	or alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%tellungsnahme%'
            	or alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%tellungnahme%'
                then true
            else false
        end as show_doc_iho_report,
        case 
            when alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') 
                in (
                    'Historische Untersuchung', 
                    'Technische Untersuchung',
                    'Detailuntersuchung',
                    'Variantenstudie',
                    'Sanierungsprojekt',
                    'Sanierungsbericht',
                    'Überwachungsbericht',
                    'Baugrundgutachten',
                    'Geologisches Gutachten',
                    'Schlussbericht',
                    'Pflichtenheft/Konzept',
                    'Aushub-/Entsorgungskonzept',
                    'Bericht : Aushubbegleitung',
                    'Stellungnahme',
                    'Verfügung',
                    'Zwischenentscheid § 21 EG USG',
                    'Bewilligung: Art 32d^bis USG'
                )
            	then true
            else false
        end as show_doc_iho_report_zg,
        case 
            when task_category.task_category_id is not null then alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), (lang.language)::text)
            else ''
        end as kategorie,
        case
            when wf_node.created_at is null then '-'
            else to_char(wf_node.created_at, 'DD.MM.YYYY')
        end as erfassungs_datum,
        case
            when wf_node.started_at is null then '-'
            else to_char(wf_node.started_at, 'DD.MM.YYYY')
        end as started_at,
        case
            when wf_node.deadline is null then '-'
            else to_char(wf_node.deadline, 'DD.MM.YYYY')
        end as deadline,
        case
            when wf_node.finished_at is null then '-'
            else to_char(wf_node.finished_at, 'DD.MM.YYYY')
        end as finished_at,
        case 
            when subj.subj_id is not null then concat_ws(' ',subj.vorname,subj.name,subj.taetigkeit)
            else ''
        end as autor,
        is_public
    from alma.vflz
        left join alma.wf_node on wf_node.entity_id in (select vflz_id from alma.vflz v where vflz.vfl_id = v.vfl_id)
        cross join ( select translations.locale as language
            from alma.translations
            group by translations.locale) lang
        left join alma.translations on wf_node.title = translations.msgid and lang.language = translations.locale
        left join alma.task_category on task_category.wf_node_id = wf_node.wf_node_id
        left join alma.bet_task on bet_task.wf_node_id = wf_node.wf_node_id and bet_task.h_bez_art = 2203
        left join alma.subj on bet_task.subj_id = subj.subj_id
    order by wf_node.started_at
;

comment on view alma_export.report_workflows_v is 'Daten der laufenden Geschäft eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_bet_v;
create view alma_export.report_bet_v as
    with subj_bem as (
        select bem.key_value as subj_id,
            string_agg(distinct bem.bem, ' | ') as bem
        from alma.bem
            join alma.bemgrp bemgr on bemgr.bemgrp_id = bem.bemgrp_id
                and (bemgr.bemgrp)::text = 'subj.subj_id'::text
        where bem.is_current
            and btrim(coalesce(bem.bem, ''::text)) <> ''::text
        group by bem.key_value
    ),
parzellen as (
    select
        x.vflz_id,
        x.subj_id,
        string_agg(
		    x.gb_nummer,
		    ', '
		    ORDER BY
		        CASE
		            WHEN x.gb_nummer ~ '^[0-9]+$' THEN 0
		            ELSE 1
		        END,
		        CASE
		            WHEN x.gb_nummer ~ '^[0-9]+$'
		            THEN x.gb_nummer::numeric
		        END,
		        x.gb_nummer
		) as parzellen
        from (
            select distinct
                bet.vflz_id,
                bet.subj_id,
                grun.gb_nummer
            from alma.bet
            join alma.bet_art
                on bet.bet_id = bet_art.bet_id
            and bet_art.is_current
            join alma.grun
                on bet_art.grun_id = grun.grun_id
            where bet.is_current
            and grun.gb_nummer is not null
        ) x
        group by
            x.vflz_id,
            x.subj_id
    )
    select bet.vflz_id,
        subj.subj_id,
        lang.language,
        case 
            when subj.vorname is null or subj.name = '' and lang.language = 'de' then 'unbekannt'::text
            when subj.vorname is null or subj.name = '' and lang.language = 'fr' then 'inconnu'::text
            when subj.vorname is null or subj.name = '' and lang.language = 'it' then 'sconosciuto'::text
            else subj.vorname
        end as bet_vorname,
        case
            when subj.name is null or subj.name = '' and lang.language = 'de' then 'unbekannt'::text
            when subj.name is null or subj.name = '' and lang.language = 'fr' then 'inconnu'::text
            when subj.name is null or subj.name = '' and lang.language = 'it' then 'sconosciuto'::text
            else subj.name
        end as bet_nachname,
        case
            when subj.taetigkeit is null and lang.language = 'de' then 'unbekannt'::text
            when subj.taetigkeit is null and lang.language = 'fr' then 'inconnu'::text
            when subj.taetigkeit is null and lang.language = 'it' then 'sconosciuto'::text
            else subj.taetigkeit
        end as taetigkeit,
        TRIM(concat_ws(' ', subj.vorname, subj.name, subj.taetigkeit)) as bet_name,
        case
            when subj.postleitzahl is null then '-'
            else subj.postleitzahl
        end as postleitzahl,
        case
            when subj.ort is null then '-'
            else subj.ort
        end as ort,
        case 
            when (subj.ort is null or subj.ort = '') and (subj.postleitzahl is null or subj.postleitzahl = '') then ''
            when (subj.ort is null or subj.ort = '') then subj.postleitzahl
            when (subj.postleitzahl is null or subj.postleitzahl = '') then subj.ort
            else concat(subj.postleitzahl, ', ', subj.ort)
        end as bet_adr,
        bet.is_eigentuemer,
        grun.h_gem_id as gemeindenummer,
        case
            when gemeinde is null then '-'
            else gemeinde
        end as gemeindename,
		parzellen.parzellen,
        bet_art.h_bez_art,
		alma.translate_code(alma.msgid_code(bet_art.h_bez_art, bet_art.c_bez_art), (lang.language)::text) as beziehung,
        case
            when subj_bem.bem is null then '-'::character varying
            else subj_bem.bem
        end as bem
    from alma.bet
        left join alma.bet_art on bet.bet_id = bet_art.bet_id and bet_art.is_current
        left join alma.grun on bet_art.grun_id = grun.grun_id
        left join alma.h_gem on grun.h_gem_id = h_gem.h_gem_id
        left join alma.subj on bet.subj_id = subj.subj_id
        left join subj_bem on subj_bem.subj_id = subj.subj_id
        left join parzellen on parzellen.vflz_id = bet.vflz_id and parzellen.subj_id = subj.subj_id
        cross join (select translations.locale as language
            from alma.translations
            group by translations.locale) lang
    where bet.is_current
    group by bet.vflz_id, bet.is_eigentuemer, bet_art.h_bez_art, bet_art.c_bez_art, subj.subj_id, 
        lang.language, grun.h_gem_id, gemeinde, subj.vorname, subj.name, subj.taetigkeit, subj_bem.bem, parzellen.parzellen
    order by bet_name
;

comment on view alma_export.report_bet_v is 'Daten der Beteiligten eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_bemerkungen_v;
create view alma_export.report_bemerkungen_v as
    select distinct bem.language,
    	bem.vflz_id,
    	bem.bem,
    	case
	    	when translations.msgstr is null then bem.title
	        else translations.msgstr
	    end as title,
	    bem.bemgrp,
	    case
	        when bem.public is true then 'ja'::text
	        else 'nein'::text
	    end as oeffentlich,
        case
            when btrim(coalesce(bem.mutierer, ''::text)) = ''::text then '-'::text
            else bem.mutierer
        end as mutierer
    from (
		(select distinct report_grunddaten_v.language,
			report_grunddaten_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_grunddaten_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'vflz_id'::text
	    	) as bem on bem.key_value = report_grunddaten_v.vflz_id 
	    )
	    union 
	    (select distinct report_vfus_v.language, 
			report_vfus_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_vfus_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'vfus_id'::text
	    	) as bem on bem.key_value = report_vfus_v.vfus_id 
	    )
	    union 
	    (select distinct report_veen_v.language, 
			report_veen_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_veen_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'veen_id'::text
	    	) as bem on bem.key_value = report_veen_v.veen_id 
	    )
	    union 
	    (select distinct report_bet_v.language,
			report_bet_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_bet_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'subj_id'::text
	    	) as bem on bem.key_value = report_bet_v.subj_id 
	    )
	    union   
	    (select distinct report_saniziel_v.language, 
			report_saniziel_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_saniziel_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'sani_id'::text
	    	) as bem on bem.key_value = report_saniziel_v.sani_id 
	    )
	    union
	    (select distinct report_workflows_v.language, 
			report_workflows_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_workflows_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'pm_cache_id'::text
	    	) as bem on bem.key_value = report_workflows_v.vflz_id 
	    )
	    union 
	    (select distinct report_massnahme_v.language,
			report_massnahme_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_massnahme_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'mass_id'::text
	    	) as bem on bem.key_value = report_massnahme_v.mass_id 
	    )
	    union 
		(select distinct report_intu_v.language,
			report_intu_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_intu_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'intu_id'::text
	    	) as bem on bem.key_value = report_intu_v.intu_id 
	    )
	    union 
		(select distinct report_intb_v.language,
			report_intb_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_intb_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'intb_id'::text
	    	) as bem on bem.key_value = report_intb_v.intb_id 
	    )
	    union 
		(select distinct report_inta_v.language, 
			report_inta_v.vflz_id,
			bem.bem, 
			bem.title,
	        bem.bemgrp,
	        bem.public,
	    	bem.mutierer
	    from alma_export.report_inta_v 
	    join (select bem.bem, bemgrp.bemgrp, bem.key_value, bem.public, bem.mutierer, bemgrp.title from alma.bem 
	    	join bemgrp on bemgrp.bemgrp_id = bem.bemgrp_id and bemgrp.key_column::text = 'inta_id'::text
	    	) as bem on bem.key_value = report_inta_v.inta_id 
	    )
	) as bem
	left join translations on translations.msgid::text = bem.title::text and translations.locale::text = bem.language::text
;
     
comment on view alma_export.report_bemerkungen_v is 'Alle Bemerkungen eines Standorts aufbereitet für die Reporte';


drop view if exists alma_export.report_parcels_v;
create view alma_export.report_parcels_v as
    select vflz_id, h_gem_id, gemeinde, string_agg(distinct gb_nummer::text, ', ') as parzellen from alma.bet 
    join alma.bet_art using (bet_id)
    join alma.grun using (grun_id)
    join alma.h_gem using (h_gem_id)
    group by vflz_id, h_gem_id, gemeinde
;

comment on view alma_export.report_parcels_v is 'Liste der erfassten Parzellen pro Gemeinde für die Reporte';


drop view if exists alma_export.report_parcels_nbident_v;
create view alma_export.report_parcels_nbident_v as
    select vflz_id, h_nb_id, bezeichnung as grundbuch, string_agg(distinct gb_nummer::text, ', ') as parzellen from alma.bet 
    join alma.bet_art using (bet_id)
    join alma.grun using (grun_id)
    join alma.h_nb using (h_nb_id)
    group by vflz_id, h_nb_id, bezeichnung
;

comment on view alma_export.report_parcels_nbident_v is 'Liste der erfassten Parzellen pro Grundbuch für die Reporte';

drop view if exists alma_export.report_parcels_cache_v;
create view alma_export.report_parcels_cache_v as
    select vflz_id, 
    lang.language,
    grun.h_gem_id as gemeindenummer, 
    gemeinde as gemeindename, 
    grun.h_nb_id as h_nb_id, 
    bezeichnung as grundbuchname, 
    string_agg(gb_nummer, ', ') AS parzellen
from alma.vflgeo
join alma.grun on st_intersects(vflgeo.wkb_geometry, grun.wkb_geometry)
left join alma.h_gem on h_gem.bfs_nummer = grun.h_gem_id
left join alma.h_nb on grun.h_nb_id = h_nb.h_nb_id
cross join (select translations.locale as language
            from alma.translations
            group by translations.locale) lang
group by vflz_id, lang.language, grun.h_gem_id, gemeinde, grun.h_nb_id, bezeichnung
;

comment on view alma_export.report_parcels_cache_v is 'Daten der Parzellen aus dem Verschnitt mit den Externen WFS Daten und dem Perimeter eines Standorts aufbereitet für die Reporte';

drop view if exists alma_export.geoportal_fr_v;

create view alma_export.geoportal_fr_v as
 select v.vflz_id,
    v.vflz_combined_id_kt as standort,
    alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), 'de'::text) as standorttyp,
    alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), 'fr'::text) as standorttyp_fr,
    coalesce(betrieb_props.betrieb_branchen, ablag_props.ablag_branche, schiessan_props.schiessan_branche, unfall_props.unfall_branche) as branche,
    coalesce(betrieb_props.betrieb_branchen_fr, ablag_props.ablag_branche_fr, schiessan_props.schiessan_branche_fr, unfall_props.unfall_branche_fr) as branche_fr,
    alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'de'::text) as statusaltlv,
    alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'fr'::text) as statusaltlv_fr,
    alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), 'de'::text) as untersuchungsmassnahmen,
    alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), 'fr'::text) as untersuchungsmassnahmen_fr,
    ablag_props.ablag_stoffe as inhalt,
    ablag_props.ablag_stoffe_fr as inhalt_fr,
    ablag_props.ablag_gesamtvol as volumen,
    coalesce(betrieb_props.inbetrieb, ablag_props.inbetrieb, schiessan_props.inbetrieb) as inbetrieb,
    coalesce(betrieb_props.von, ablag_props.von, schiessan_props.von, unfall_props.von) as anfangbetrieb,
    coalesce(betrieb_props.von_fr, ablag_props.von_fr, schiessan_props.von_fr, unfall_props.von_fr) as anfangbetrieb_fr,
    coalesce(betrieb_props.bis, ablag_props.bis, schiessan_props.bis) as endebetrieb,
    coalesce(betrieb_props.bis_fr, ablag_props.bis_fr, schiessan_props.bis_fr) as endebetrieb_fr,
    to_char((v.dat_rechtskraft)::timestamp with time zone, 'DD.MM.YYYY'::text) as ersteintrag,
    to_char((v.dat_publizieren)::timestamp with time zone, 'DD.MM.YYYY'::text) as letzteanpassung,
    to_char(((v.vflz_created_date)::date)::timestamp with time zone, 'DD.MM.YYYY'::text) as lastsnapshot,
    vfus_agg.festgestellteumwelteinwirkungen,
    vfus_agg.festgestellteumwelteinwirkungen_fr,
    veen_agg.besonderevorkommnisse,
    veen_agg.besonderevorkommnisse_fr,
        case
            when (public.st_geometrytype(vflgeo.wkb_geometry) = 'st_point'::text) then public.st_buffer(vflgeo.wkb_geometry, (10)::double precision)
            else vflgeo.wkb_geometry
        end as wkb_geometry
   from ((((((((((alma.vflz v
     join alma.vflnr on (((vflnr.vflz_id = v.vflz_id) and (vflnr.aktiv = true))))
     join alma.vflz_is_published_v vip on ((vip.vflz_id = v.vflz_id)))
     join alma.bere bere on (((bere.vflz_id = v.vflz_id))))
     join alma.cod_kbsinfo kbs on (((bere.h_bere_res_abwbewe = kbs.h_bere_res_abwbewe and bere.c_bere_res_abwbewe = kbs.c_bere_res_abwbewe and kbs.belastet)))
     join alma.vflgeo on ((v.vflz_id = vflgeo.vflz_id)))
     left join ( select inta.vflz_id,
            alma.translate_code(alma.msgid_code(25, '8414'::character varying), 'de'::text) as ablag_branche,
            alma.translate_code(alma.msgid_code(25, '8414'::character varying), 'fr'::text) as ablag_branche_fr,
            ((((coalesce(to_char((min(inta.inta_ablag_von))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text)) || ' '::text) || alma.translate_code('bis'::text, 'de'::text)) || ' '::text) ||
                case
                    when bool_or(inta.zeitraum_bisheute) then alma.translate_code('heute'::text, 'de'::text)
                    else coalesce(to_char((max(inta.inta_ablag_bis))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))
                end) as ablag_zeitraum,
            bool_or(inta.zeitraum_bisheute) as inbetrieb,
            (coalesce(to_char((min(inta.inta_ablag_von))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))) as von,
            (coalesce(to_char((min(inta.inta_ablag_von))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))) as von_fr,
                case
                    when bool_or(inta.zeitraum_bisheute) then alma.translate_code('heute'::text, 'de'::text)
                    else coalesce(to_char((max(inta.inta_ablag_bis))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))
                end as bis,
                case
                    when bool_or(inta.zeitraum_bisheute) then alma.translate_code('heute'::text, 'fr'::text)
                    else coalesce(to_char((max(inta.inta_ablag_bis))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))
                end as bis_fr,
            sum(inta.inta_vol_kompartiment) as ablag_gesamtvol,
            array_to_string(array_agg((alma.translate_code(alma.msgid_code(kksk.h_kksk_stoffkl, kksk.c_kksk_stoffkl), 'de'::text) || coalesce((': '::text || alma.translate_code(alma.msgid_code(kksg.h_kksg_stoffgrp, kksg.c_kksg_stoffgrp), 'de'::text)), ''::text))), '

'::text) as ablag_stoffe,
            array_to_string(array_agg((alma.translate_code(alma.msgid_code(kksk.h_kksk_stoffkl, kksk.c_kksk_stoffkl), 'fr'::text) || coalesce((': '::text || alma.translate_code(alma.msgid_code(kksg.h_kksg_stoffgrp, kksg.c_kksg_stoffgrp), 'fr'::text)), ''::text))), '

'::text) as ablag_stoffe_fr
           from ((alma.inta
             left join alma.kksk on ((kksk.inta_id = inta.inta_id)))
             left join alma.kksg on ((kksk.kksk_id = kksg.kksk_id)))
          group by inta.vflz_id) ablag_props on (((ablag_props.vflz_id = v.vflz_id) and ((v.c_vflz_vftyp)::text = '01'::text))))
     left join ( select intb.vflz_id,
            array_to_string(array_agg( alma.translate_code(alma.msgid_code(intb.h_intb_bran, intb.c_intb_bran), 'de'::text)), ' '::text) as betrieb_branchen,
            array_to_string(array_agg( alma.translate_code(alma.msgid_code(h_intb_bran, c_intb_bran), 'fr'::text)), ' '::text) as betrieb_branchen_fr,
            ((((coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text)) || ' '::text) || alma.translate_code('bis'::text, 'de'::text)) || ' '::text) ||
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'de'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))
                end) as betrieb_zeitraum,
            ((((coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text)) || ' '::text) || alma.translate_code('bis'::text, 'fr'::text)) || ' '::text) ||
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'fr'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))
                end) as betrieb_zeitraum_fr,
            bool_or(intb.zeitraum_bisheute) as inbetrieb,
            (coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))) as von,
            (coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))) as von_fr,
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'de'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))
                end as bis,
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'fr'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))
                end as bis_fr
           from alma.intb
          group by intb.vflz_id) betrieb_props on (((betrieb_props.vflz_id = v.vflz_id) and ((v.c_vflz_vftyp)::text = '02'::text))))
     left join ( select intu.vflz_id,
            alma.translate_code(alma.msgid_code(25, '98'::character varying), 'de'::text) as unfall_branche,
            alma.translate_code(alma.msgid_code(25, '98'::character varying), 'fr'::text) as unfall_branche_fr,
            (coalesce(to_char((min(intu.intu_unfallvon))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))) as von,
            (coalesce(to_char((min(intu.intu_unfallvon))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))) as von_fr,
            sum(inum.inum_stoffmng) as intu_gesamtvol,
            array_to_string(array_agg(alma.translate_code(alma.msgid_code(inum.h_inum_stoffe, inum.c_inum_stoffe), 'de'::text)), '

'::text) as unfall_stoffe,
            array_to_string(array_agg(alma.translate_code(alma.msgid_code(inum.h_inum_stoffe, inum.c_inum_stoffe), 'de'::text)), '

'::text) as unfall_stoffe_fr
           from (alma.intu
             left join alma.inum on ((inum.intu_id = intu.intu_id)))
          group by intu.vflz_id) unfall_props on (((unfall_props.vflz_id = v.vflz_id) and ((v.c_vflz_vftyp)::text = '03'::text))))
     left join ( select intb.vflz_id,
            alma.translate_code(alma.msgid_code(25, '9143'::character varying), 'de'::text) as schiessan_branche,
            alma.translate_code(alma.msgid_code(25, '9143'::character varying), 'fr'::text) as schiessan_branche_fr,
            ((((coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text)) || ' '::text) || alma.translate_code('bis'::text, 'de'::text)) || ' '::text) ||
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'de'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))
                end) as betrieb_zeitraum,
            ((((coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text)) || ' '::text) || alma.translate_code('bis'::text, 'fr'::text)) || ' '::text) ||
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'fr'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))
                end) as betrieb_zeitraum_fr,
            bool_or(intb.zeitraum_bisheute) as inbetrieb,
            (coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))) as von,
            (coalesce(to_char((min(intb.intb_vonbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))) as von_fr,
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'de'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'de'::text))
                end as bis,
                case
                    when bool_or(intb.zeitraum_bisheute) then alma.translate_code('heute'::text, 'fr'::text)
                    else coalesce(to_char((max(intb.intb_bisbetrieb))::timestamp with time zone, 'DD.MM.YYYY'::text), alma.translate_code('unbekannt'::text, 'fr'::text))
                end as bis_fr
           from alma.intb
          group by intb.vflz_id) schiessan_props on (((schiessan_props.vflz_id = v.vflz_id) and ((v.c_vflz_vftyp)::text = '04'::text))))
     left join ( select vfus.vflz_id,
            array_to_string(array_agg(((alma.translate_code(alma.msgid_code(vfus.h_vfus_art_schaden, vfus.c_vfus_art_schaden), 'de'::text) || coalesce((': '::text || alma.translate_code(alma.msgid_code(vfus.h_vfus_schaeden, vfus.c_vfus_schaeden), 'de'::text)), ''::text)) || coalesce(((' ('::text || replace((bem.bem)::text, 'Menaces environnement: '::text, ''::text)) || ')'::text), ''::text))), '
'::text) as festgestellteumwelteinwirkungen,
            array_to_string(array_agg(((alma.translate_code(alma.msgid_code(vfus.h_vfus_art_schaden, vfus.c_vfus_art_schaden), 'fr'::text) || coalesce((': '::text || alma.translate_code(alma.msgid_code(vfus.h_vfus_schaeden, vfus.c_vfus_schaeden), 'fr'::text)), ''::text)) || coalesce(((' ('::text || replace((bem.bem)::text, 'Menaces environnement: '::text, ''::text)) || ')'::text), ''::text))), '
'::text) as festgestellteumwelteinwirkungen_fr
           from ((alma.vfus
             join alma.bem on ((bem.key_value = vfus.vfus_id)))
             join alma.bemgrp on (((bemgrp.bemgrp_id = bem.bemgrp_id) and ((bemgrp.bemgrp)::text = 'vfus.vfus_id'::text))))
          group by vfus.vflz_id) vfus_agg on ((vfus_agg.vflz_id = v.vflz_id)))
     left join ( select veen.vflz_id,
            array_to_string(array_agg(((coalesce((to_char((veen.veen_datum)::timestamp with time zone, 'DD.MM.YYYY'::text) || ': '::text), ''::text) || coalesce(alma.translate_code(alma.msgid_code(veen.h_veen_natuerlich, veen.c_veen_natuerlich), 'fr'::text), ''::text)) || coalesce(((' ('::text || (bem.bem)::text) || ')'::text), ''::text))), '
'::text) as besonderevorkommnisse_fr,
            array_to_string(array_agg(((coalesce((to_char((veen.veen_datum)::timestamp with time zone, 'DD.MM.YYYY'::text) || ': '::text), ''::text) || coalesce(alma.translate_code(alma.msgid_code(veen.h_veen_natuerlich, veen.c_veen_natuerlich), 'de'::text), ''::text)) || coalesce(((' ('::text || (bem.bem)::text) || ')'::text), ''::text))), '
'::text) as besonderevorkommnisse
           from ((alma.veen
             join alma.bem on ((bem.key_value = veen.veen_id)))
             join alma.bemgrp on (((bemgrp.bemgrp_id = bem.bemgrp_id) and ((bemgrp.bemgrp)::text = 'veen.veen_id'::text))))
          group by veen.vflz_id, bem.bem) veen_agg on ((veen_agg.vflz_id = v.vflz_id)))
  where (vip.is_latest_published and kbs.belastet and v.c_org_kuerzel = (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'));


comment on view alma_export.geoportal_fr_v is 'Export Data für Geoportal Kanton FR, Automatisierte Datenübernahme nach alma_export.geoportal_fr';


drop view if exists alma_export.report_stoffe_v;

create view alma_export.report_stoffe_v as
    select vflz_id, 
    lang.language,
    case
        when ((alma.translate_code(alma.msgid_code(h_stoffe_gruppe, c_stoffe_gruppe), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(h_stoffe_gruppe, c_stoffe_gruppe), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(h_stoffe_gruppe, c_stoffe_gruppe), (lang.language)::text)
    end as stoffgruppe,
    case
        when ((alma.translate_code(alma.msgid_code(h_stoffe_stoff, c_stoffe_stoff), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(h_stoffe_stoff, c_stoffe_stoff), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(h_stoffe_stoff, c_stoffe_stoff), (lang.language)::text)
    end as stoff,
    case
        when ((alma.translate_code(alma.msgid_code(h_stoffe_umweltbereich, c_stoffe_umweltbereich), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(h_stoffe_umweltbereich, c_stoffe_umweltbereich), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(h_stoffe_umweltbereich, c_stoffe_umweltbereich), (lang.language)::text)
    end as umweltbereich,
    case
        when ((alma.translate_code(alma.msgid_code(h_stoffe_beurteilung, c_stoffe_beurteilung), (lang.language)::text) is null) 
            or (alma.translate_code(alma.msgid_code(h_stoffe_beurteilung, c_stoffe_beurteilung), (lang.language)::text) = ''::text)) then '-'::text
        else alma.translate_code(alma.msgid_code(h_stoffe_beurteilung, c_stoffe_beurteilung), (lang.language)::text)
    end as beurteilung
    from alma.stoffe 
    cross join ( select translations.locale as language
        from alma.translations
        group by translations.locale) lang
;

comment on view alma_export.report_stoffe_v is 'Liste der erfassten Stoffe für die Reporte';



drop view if exists alma_export.report_berichte_be_v;
create view alma_export.report_berichte_be_v as
     select vflz.vflz_id,
 		vflz.vfl_id,
        lang.language,
        case
            when wf_node.title is null then '-'
            when translations.msgstr is null then wf_node.title
            else translations.msgstr
        end as title,
        case 
            when wf_node.type is null then '-'
            else wf_node.type
        end as type,
        case 
            when alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%ericht%' 
            	or alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%tellungsnahme%'
            	or alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%tellungnahme%'
                then true
            else false
        end as show_doc_iho_report,
        case 
            when task_category.task_category_id is not null then alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), (lang.language)::text)
            else ''
        end as kategorie,
        case
            when wf_node.created_at is null then '-'
            else to_char(wf_node.created_at, 'DD.MM.YYYY')
        end as erfassungs_datum,
        case
            when wf_node.started_at is null then '-'
            else to_char(wf_node.started_at, 'DD.MM.YYYY')
        end as started_at,
        case
            when wf_node.deadline is null then '-'
            else to_char(wf_node.deadline, 'DD.MM.YYYY')
        end as deadline,
        case
            when wf_node.finished_at is null then '-'
            else to_char(wf_node.finished_at, 'DD.MM.YYYY')
        end as finished_at,
        case 
            when subj.subj_id is not null then concat_ws(' ',subj.vorname,subj.name,subj.taetigkeit)
            else ''
        end as autor,
        is_public
    from alma.vflz
        left join alma.wf_node on wf_node.entity_id in (select vflz_id from alma.vflz v where vflz.vfl_id = v.vfl_id)
        cross join ( select translations.locale as language
            from alma.translations
            group by translations.locale) lang
        left join alma.translations on wf_node.title = translations.msgid and lang.language = translations.locale
        left join alma.task_category on task_category.wf_node_id = wf_node.wf_node_id
        left join alma.bet_task on bet_task.wf_node_id = wf_node.wf_node_id and bet_task.h_bez_art = 2203
        left join alma.subj on bet_task.subj_id = subj.subj_id
    where wf_node.parent_id in (select wf_node_id from alma.wf_node where title = 'Berichte')
    order by wf_node.started_at
;

comment on view alma_export.report_berichte_be_v is 'Daten der Tasks unter der Aufgabe ''Berichte'' eines Standorts aufbereitet für die Reporte des Kanton Bern';


drop view if exists alma_export.report_workflows_be_v;
create view alma_export.report_workflows_be_v as
     select vflz.vflz_id,
 		vflz.vfl_id,
        lang.language,
        case
            when wf_node.title is null then '-'
            when translations.msgstr is null then wf_node.title
            else translations.msgstr
        end as title,
        case 
            when wf_node.type is null then '-'
            else wf_node.type
        end as type,
        case 
            when alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%ericht%' 
            	or alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%tellungsnahme%'
            	or alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), 'de') like '%tellungnahme%'
                then true
            else false
        end as show_doc_iho_report,
        case 
            when task_category.task_category_id is not null then alma.translate_code(alma.msgid_code(task_category.h_category , task_category.c_category), (lang.language)::text)
            else ''
        end as kategorie,
        case
            when wf_node.created_at is null then '-'
            else to_char(wf_node.created_at, 'DD.MM.YYYY')
        end as erfassungs_datum,
        case
            when wf_node.started_at is null then '-'
            else to_char(wf_node.started_at, 'DD.MM.YYYY')
        end as started_at,
        case
            when wf_node.deadline is null then '-'
            else to_char(wf_node.deadline, 'DD.MM.YYYY')
        end as deadline,
        case
            when wf_node.finished_at is null then '-'
            else to_char(wf_node.finished_at, 'DD.MM.YYYY')
        end as finished_at,
        case 
            when subj.subj_id is not null then concat_ws(' ',subj.vorname,subj.name,subj.taetigkeit)
            else ''
        end as sachbearbeitung,
        is_public
    from alma.vflz
        left join alma.wf_node on wf_node.entity_id in (select vflz_id from alma.vflz v where vflz.vfl_id = v.vfl_id)
        cross join ( select translations.locale as language
            from alma.translations
            group by translations.locale) lang
        left join alma.translations on wf_node.title = translations.msgid and lang.language = translations.locale
        left join alma.task_category on task_category.wf_node_id = wf_node.wf_node_id
        left join alma.bet_task on bet_task.wf_node_id = wf_node.wf_node_id and bet_task.h_bez_art = 2202
        left join alma.subj on bet_task.subj_id = subj.subj_id
    where wf_node.parent_id is null and type in ('workflow', 'task')
    order by wf_node.started_at desc
;

comment on view alma_export.report_workflows_be_v is 'Daten der Geschäft und Aufgaben auf oberster Ebene eines Standorts aufbereitet für die Reporte des Kanton Bern';


drop view if exists alma_export.tg_kbs_intern;

create view alma_export.tg_kbs_intern as 
    select v.vflz_id as mapserver_id,
        'stao'::text || v.vflz_id::text as stao_tid,
        v.vflz_combined_id_kt as katasternummer,
        v.bezeichnung,
        alma.translate_code(alma.msgid_code(v.h_vflz_bearbstand, v.c_vflz_bearbstand), 'de'::text) as bearbeitungsstand_kbs,
        (select msgstr from alma.translations where msgid = 'interlis_settings.url_standort') 
        || '?Y='::text 
        || st_x(v.zentroid)::text 
        || '&X='::text 
        || st_y(v.zentroid)::text 
        as url_standort,
        vflgeo.wkb_geometry,
        h_gem.gemeinde,
        case
            when parzellen.parzellen = ': '::text then null::text
            else parzellen.parzellen
        end as parzellen,
        null::text as egrid,
        staotyp_mapping.code_long as standorttyp,
        case 
	        when v.in_betrieb = true then true 
        	else false
        end as inbetrieb,
        case
            when v.in_betrieb then v.c_vflz_deponietyp
            else null::text
        end as deponietyp,
        case 
	        when v.nachsorge = true then true 
        	else false
        end as nachsorge,
        case
            when untmass_aktuellste.untmass is not null then untmass_aktuellste.untmass
            else 'UntMassn1'::text
        end as untersuchungsmassnahmen,
        statusaltlv_mapping.code_long as statusaltlv,
        v.dat_rechtskraft as ersteintrag,
        (( select vflz_is_published_v.dat_latest_published::text as dat_latest_published
            from alma.vflz_is_published_v
            where (vflz_is_published_v.vflz_id in 
                ( select vflz_any_in_vfl.vflz_id
                from alma.vflz vflz_any_in_vfl
                where vflz_any_in_vfl.vfl_id = v.vfl_id)) 
            and vflz_is_published_v.is_latest_published
        ))::date as letzteanpassung,
        ((select msgstr from alma.translations where msgid = 'interlis_settings.url_kbs_auszug') 
        || vfilename.filename) as url_kbs_auszug,
        bem_standort.bem as bemerkung,
        'zb'::text || (select msgstr from alma.translations where msgid = 'interlis_settings.amt_id') as zustaendigkeitkataster_id,
        upper(alma.translate_code(alma.msgid_code(v.h_org_kuerzel, v.c_org_kuerzel), 'de'::text)) as zustaendigkeitkataster,
        parzellen.grundbuch
    from alma.vflz_current_v cv
    left join alma.vflz v using (vflz_id)
    left join alma_export.interlis_cod_mapping_v staotyp_mapping 
        on staotyp_mapping.c_cli_id = v.h_vflz_vftyp 
        and staotyp_mapping.code::text = v.c_vflz_vftyp::text
    left join alma.bere bere on bere.vflz_id = v.vflz_id
    left join alma.cod_kbsinfo kbs 
        on (bere.h_bere_res_abwbewe = kbs.h_bere_res_abwbewe 
            and bere.c_bere_res_abwbewe = kbs.c_bere_res_abwbewe
            and kbs.belastet)
    left join alma_export.interlis_cod_mapping_v statusaltlv_mapping 
        on statusaltlv_mapping.c_cli_id = bere.h_bere_res_abwbewe 
        and statusaltlv_mapping.code::text = bere.c_bere_res_abwbewe::text
    left join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv
    left join alma.vflgeo on vflgeo.vflz_id = v.vflz_id
    left join alma.bemgrp bemg_standort on bemg_standort.public 
        and bemg_standort.bemgrp::text = 'standort'::text
    left join alma.bem bem_standort on bem_standort.bemgrp_id = bemg_standort.bemgrp_id 
        and bem_standort.key_value = v.vflz_id and bem_standort.public
    left join alma_export.vflz_filename_v vfilename on vfilename.vflz_id = v.vflz_id
    left join ( select p2.vflz_id,
            array_to_string(array_agg(concat(p2.nbident, ': ', p2.par1)), '; '::text) as parzellen,
            array_to_string(array_agg(p2.grundbuch), '; '::text) as grundbuch
           from ( select p1.vflz_id,
                    p1.nbident,
                    array_to_string(array_agg(p1.gb_nummer order by p1.gb_nummer), ','::text) as par1,
                    p1.grundbuch::text as grundbuch
                   from 
                   	( select g.h_nb_id as nbident,
                            bet.vflz_id,
                            g.gb_nummer,
                            nb.bezeichnung as grundbuch
                           from alma.bet_art ba
                           	left join alma.bet using (bet_id)
                             left join alma.grun g on ba.grun_id = g.grun_id
                             left join alma.h_nb nb on nb.h_nb_id = g.h_nb_id
                           where  ba.grun_id is not null
                          group by g.h_nb_id, bet.vflz_id, g.gb_nummer, nb.bezeichnung
                          order by bet.vflz_id, g.gb_nummer) p1
                  group by p1.vflz_id, p1.nbident, p1.grundbuch
                  order by p1.vflz_id) p2
          group by p2.vflz_id) 
        parzellen on parzellen.vflz_id = v.vflz_id
     left join ( select unt.vfl_id,
            array_to_string(array_agg(unt.code_long), ','::text) as untmass
           from ( select tm.code_long,
                    tm.ili_code,
                    tm.ili_c_cli_id,
                    v_1.vfl_id
                   from alma_export.interlis_task_mapping_v tm
                     join alma.vflz v_1 on v_1.c_vflz_unterstand::text = tm.a4w_code::text
                  group by tm.code_long, tm.ili_code, tm.ili_c_cli_id, v_1.vfl_id
                  order by v_1.vfl_id) unt
          group by unt.vfl_id) untmass_aktuellste on untmass_aktuellste.vfl_id = v.vfl_id
     left join alma.h_gem on h_gem.h_gem_id = v.h_gem_id
;

comment on view alma_export.tg_kbs_intern is 'Daten für internen WFS Export Kanton TG';
