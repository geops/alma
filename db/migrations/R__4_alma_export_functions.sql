drop function if exists alma_export.interlis_geometry_point(p_geom public.geometry);

create function alma_export.interlis_geometry_point(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare
    result xml;
    geom_type text;
begin
    geom_type := st_geometrytype(p_geom);
    if geom_type = 'ST_Point' then
        select xmlelement(name "COORD", xmlelement(name "C1", round(st_x(p_geom)::decimal,3)),
                xmlelement(name "C2", round(st_y(p_geom)::decimal, 3)),
                case when st_ndims(p_geom) > 2 then xmlelement(name "C3", st_z(p_geom)) else null end
                )
                into result;
    else
        raise 'unsupported geometry type: %', geom_type;
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_geometry_point is 'INTERLIS XML Export für Punkt Geometrien';



drop function if exists alma_export.interlis_geometry_line_dumppoints(p_geom public.geometry);

create function alma_export.interlis_geometry_line_dumppoints(p_geom public.geometry) returns setof public.geometry
    language plpgsql strict
    as $$
declare
    last_point geometry;
    this_point geometry;
    skip_point boolean;
begin
    /**
     dump all geoemtries from a line and skip duplicate points when they
     directly follow each other as this does not seem to be supported by the interlis
     format. At least the interlischecker complains about it.
    */
    last_point := Null;
for this_point in select st_snaptogrid(st_pointn(p_geom, generate_series(1,st_numpoints(p_geom))), 0.001) loop
        skip_point := true;
        if last_point is not null then
            skip_point := ST_Equals(last_point, this_point);
        else
            skip_point := false;
        end if;

        if not skip_point then
            return next this_point;
        end if;
        last_point := this_point;
    end loop;
    return;
end
 $$;

comment on function alma_export.interlis_geometry_line_dumppoints is 'INTERLIS XML Export für Punkte von Linien Geometrien';



drop function if exists alma_export.interlis_geometry_line(p_geom public.geometry);

CREATE FUNCTION alma_export.interlis_geometry_line(p_geom public.geometry) RETURNS xml
    LANGUAGE plpgsql STRICT
    AS $$
declare
    result xml;
    geom_type text;
begin
    geom_type := st_geometrytype(p_geom);
    if geom_type = 'ST_Line' or geom_type = 'ST_LineString' then
        -- TODO: check how internal rings are nested
        select xmlelement(name "POLYLINE", xmlagg(geomxml)) into result
            from (
                select alma_export.interlis_geometry_point(
                    alma_export.interlis_geometry_line_dumppoints(p_geom)
                ) as geomxml
            ) foo;
    else
        raise 'unsupported geometry type: %', geom_type;
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_geometry_line is 'INTERLIS XML Export für Muiltilinien Geometrien';



drop function if exists alma_export.interlis_geometry_polygon_boundaries_internal(p_geom public.geometry);

CREATE FUNCTION alma_export.interlis_geometry_polygon_boundaries_internal(p_geom public.geometry) RETURNS xml
    LANGUAGE plpgsql STRICT
    AS $$
declare
    result xml;
    geom_type text;
begin
    geom_type := st_geometrytype(p_geom);
    if geom_type = 'ST_Polygon' then
        select xmlagg(geoxmltext::xml) into result
                from (
                    select xmlelement(name "BOUNDARY", geom)::text as geoxmltext
                        from  (
                            select alma_export.interlis_geometry_line(
                                st_ExteriorRing(p_geom)
                                ) as geom
                            union all
                            select alma_export.interlis_geometry_line(
                                ST_InteriorRingN(p_geom, generate_series(1,st_NumInteriorRings(p_geom)))
                                )
                        ) foo2
                ) foo;
    else
        raise 'unsupported geometry type: %', geom_type;
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_geometry_polygon_boundaries_internal is 'INTERLIS XML Export für die richtige Reihenfolge der Punkte bei Ring-Polygonen Geometrien';



drop function if exists alma_export.interlis_geometry_polygon(p_geom public.geometry);

create function alma_export.interlis_geometry_polygon(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare
    result xml;
    geom_type text;
begin
    geom_type := st_geometrytype(p_geom);
    if geom_type = 'ST_Polygon' then
        -- TODO: check how internal rings are nested
        select xmlelement(name "SURFACE", alma_export.interlis_geometry_polygon_boundaries_internal(p_geom) ) into result;
    else
        raise 'unsupported geometry type: %', geom_type;
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_geometry_polygon is 'INTERLIS XML Export für Polygon Geometrien';



drop function if exists alma_export.interlis_kbs_v1_5_geometry_polygon_boundaries_internal(p_geom public.geometry);

CREATE FUNCTION alma_export.interlis_kbs_v1_5_geometry_polygon_boundaries_internal(p_geom public.geometry) RETURNS xml
    LANGUAGE plpgsql STRICT
    AS $$
 declare                                                                                                 
     result xml;                                                                                         
     geom_type text;                                                                                     
     geom_srid integer;                                                                                  
     geom_numintrings integer;                                                                           
 begin                                                                                                   
     geom_type := st_geometrytype(p_geom);                                                               
     geom_srid := st_srid(p_geom);                                                                       
     geom_numintrings := st_numinteriorring(p_geom);                                                     
     if geom_type = 'ST_Polygon' and geom_srid = 2056 and geom_numintrings < 1 then                      
     select xmlagg(geoxmltext::xml) into result                                                          
                 from (                                                                                  
                     select xmlelement(name "KbS_V1_5.Belastete_Standorte.PolygonStructure",             
                             xmlelement(name "Polygon",                                                  
                             xmlelement(name "SURFACE",                                                  
                             xmlelement(name "BOUNDARY", geom))))::text as geoxmltext                    
                         from  (                                                                         
                             select alma_export.interlis_geometry_line(                                          
                                 st_ExteriorRing(p_geom)                                                 
                                 ) as geom                                                               
                             union all                                                                   
                             select alma_export.interlis_geometry_line(                                          
                                 ST_InteriorRingN(p_geom, generate_series(1,st_NumInteriorRings(p_geom)))
                                 )                                                                       
                         ) foo2                                                                          
                 ) foo;                                                                                  
     elsif geom_type = 'ST_Polygon' and geom_srid = 2056 and geom_numintrings > 0 then                   
     select xmlagg(geoxmltext::xml) into result                                                          
                 from (                                                                                  
                     select xmlelement(name "KbS_V1_5.Belastete_Standorte.PolygonStructure",             
                             xmlelement(name "Polygon",                                                  
                             xmlelement(name "SURFACE", geom)))::text as geoxmltext                      
                         from  (                                                                         
                             select alma_export.interlis_geometry_polygon_boundaries_internal(p_geom) as geom    
                         ) foo2                                                                          
                 ) foo;                                                                                  
                                                                                                         
     elsif geom_type != 'ST_Polygon' then                                                                
         raise 'unsupported geometry type: %', geom_type;                                                
     else                                                                                                
         raise 'unsupported geometry srid: %', geom_srid;                                                
     end if;                                                                                             
     return result;                                                                                      
 end
$$;

comment on function alma_export.interlis_kbs_v1_5_geometry_polygon_boundaries_internal is '';



drop function if exists alma_export.interlis_kbs_v1_5_geometry_multipolygon(p_geom public.geometry);

create function alma_export.interlis_kbs_v1_5_geometry_multipolygon(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
 declare                                                                                           
     result xml;                                                                                  
     geom_type text;                                                                               
     geom_srid integer;                                                                            
 begin                                                                                             
     geom_type := st_geometrytype(p_geom);                                                         
     geom_srid := st_srid(p_geom);                                                                 
     if geom_type = 'ST_MultiPolygon' and geom_srid = 2056 then                                    
       select xmlelement(name "KbS_V1_5.Belastete_Standorte.MultiPolygon",                         
             xmlelement(name "Polygones", xmlagg(geomxml))) into result                            
                         from (select alma_export.interlis_kbs_v1_5_geometry_polygon_boundaries_internal(
                               st_geometryn(p_geom, generate_series(1,st_numgeometries(p_geom)))   
                           )as geomxml                                                             
             ) foo;                                                                                
     elsif geom_type != 'ST_MultiPolygon' then                                                     
         raise 'unsupported geometry type: %', geom_type;                                          
     else                                                                                          
         raise 'unsupported geometry srid: %', geom_srid;                                          
     end if;                                                                                       
     return result;                                                                                
 end 
$$;

comment on function alma_export.interlis_kbs_v1_5_geometry_multipolygon is '';



drop function if exists alma_export.interlis_kbs_v1_5_geometry(p_geom public.geometry);

create function alma_export.interlis_kbs_v1_5_geometry(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare                                                                 
     result xml;                                                         
     geom_type text;                                                     
 begin                                                                                                                                    
                                                                         
     geom_type := st_geometrytype(p_geom);                               
     if geom_type = 'ST_Point' then                                      
         result := alma_export.interlis_geometry_point(p_geom);                  
     elsif geom_type = 'ST_Line' or geom_type = 'ST_LineString' then     
         result := alma_export.interlis_geometry_line(p_geom);                   
     elsif geom_type = 'ST_Polygon' then                                 
         result := alma_export.interlis_geometry_polygon(p_geom);                
      elsif geom_type = 'ST_MultiPolygon' then                           
         result := alma_export.interlis_kbs_v1_5_geometry_multipolygon(p_geom);
     else                                                                
         raise 'unsupported geometry type: %', geom_type;                
     end if;                                                             
     return result;                                                      
 end 
$$;

comment on function alma_export.interlis_kbs_v1_5_geometry is '';



drop function if exists alma_export.interlis_kbs_localisedtext_t(p_text text, p_locales text[]);

create function alma_export.interlis_kbs_localisedtext_t(p_text text, p_locales text[]) returns xml
    language plpgsql strict
    as $$
declare
    result xml;
begin
    select xmlelement(name "LocalisationCH_V1.MultilingualText",
            xmlelement(name "LocalisedText", xmlagg(foo.lt))
            ) into result
        from (
            select xmlelement(name "LocalisationCH_V1.LocalisedText",
                xmlelement(name "Language", ls.locale ),
                xmlelement(name "Text", alma.translate_code(p_text, ls.locale) )
                ) as lt
            from (
               select lower(locale) as locale, coalesce(lo.sort_key, 1337) as sort_key
               from unnest(p_locales) p(locale)
               left join alma_export.interlis_language_ordering lo on lo.lang=lower(p.locale)
            ) ls
            order by ls.sort_key
        ) foo;
    return result;
end
$$;

comment on function alma_export.interlis_kbs_localisedtext_t is '';



drop function if exists alma_export.interlis_kbs_v1_5(p_vflz_ids integer[]);

create function alma_export.interlis_kbs_v1_5(p_vflz_ids integer[]) returns xml
    language sql
    as $_$

with bidprops as (
    select 
        'kbsMGDM' || msgstr as bid
    from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'
),

wmsprops as (
    (select msgstr as url_geoportal from alma.translations s where s.msgid = 'interlis_settings.url_standort' and locale = 'de') 
),


-- all sites of the list of vflz_ids
standorte as (
    select 'stao'||v.vflz_id::text as stao_tid,
        v.vflz_id,
        v.vfl_id,
        v.vflz_combined_id_kt,
        vflgeo.wkb_geometry,
        vflnr.c_org_kuerzel,
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid,
        bem_standort.bem as standort_bemerkungen,
        zentroid as wkb_point,
        staotyp_mapping.code_long as staotyp,
        v.c_vflz_deponietyp::text as deponietyp,
        case when v.nachsorge = true then true::text else false::text end as nachsorge,
        v.dat_rechtskraft::date as date_ersteintrag,
        (   -- legally binding date
            select vflz_is_published_v.dat_latest_published::text as dat_latest_published
               from alma.vflz_is_published_v
               where (vflz_is_published_v.vflz_id in ( select vflz_any_in_vfl.vflz_id
                                    from alma.vflz vflz_any_in_vfl
                                    where vflz_any_in_vfl.vfl_id = v.vfl_id)
                    ) and vflz_is_published_v.is_latest_published
        )::date as date_letzteanpassung,
        statusaltlv_mapping.code_long as statusaltlv,
        case when v.in_betrieb = true then true::text else false::text end as in_betrieb,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') is not null then
          (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') 
          || (regexp_replace(vfilename.filename::text, ' '::text, '%20'::text, 'g'::text))
          else null end as url_kbs_datasheet
    from alma.vflz v
    join alma.vflz_is_published_v vip on v.vflz_id = vip.vflz_id and vip.is_latest_published /* only published versions */
    join alma_export.interlis_cod_mapping_v staotyp_mapping on staotyp_mapping.c_cli_id = v.h_vflz_vftyp
                and staotyp_mapping.code = v.c_vflz_vftyp
    join alma.bere on bere.vflz_id = v.vflz_id 
    join alma.cod_kbsinfo info on info.h_bere_res_abwbewe = bere.h_bere_res_abwbewe and info.c_bere_res_abwbewe=bere.c_bere_res_abwbewe and info.belastet
    join alma_export.interlis_cod_mapping_v statusaltlv_mapping on statusaltlv_mapping.c_cli_id = bere.h_bere_res_abwbewe
                and statusaltlv_mapping.code = bere.c_bere_res_abwbewe
    join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv

    left  join alma.vflgeo on vflgeo.vflz_id = v.vflz_id
    left join alma.bemgrp bemg_standort on bemg_standort.public and bemg_standort.bemgrp='standort'
    left join alma.bem bem_standort on bem_standort.bemgrp_id = bemg_standort.bemgrp_id and
                bem_standort.key_value = v.vflz_id and bem_standort.public

    left join alma_export.vflz_filename_v vfilename on vfilename.vflz_id = v.vflz_id

    where v.vfl_id in (
        select vfl_id from alma.vflz where vflz_id = any($1)
    )
    and vflnr.c_org_kuerzel in (
        select distinct trim(unnest(string_to_array(msgstr, ',')))
        from alma.translations
        where msgid in ('interlis_settings.aemter_vollzug', 'interlis_settings.amt_kuerzel')
            and locale = 'de'
            and msgstr is not null
            and msgstr != ''
    )
    order by v.vflz_id
),

geoportallinks as (
    select
        standorte.vflz_id,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'standortnummer' then
          wmsprops.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text))
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops.url_geoportal || '&y=' || st_x(standorte.wkb_point)::text || '&x=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops.url_geoportal || '&map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops.url_geoportal || '&c=' || st_y(standorte.wkb_point)::text || ',' || st_x(standorte.wkb_point)::text 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops.url_geoportal 
        end as permalink_geoportal
    from standorte, wmsprops
),


-- saved parcels for all returned sites
parzellen as (
  select 
    grun.h_nb_id as nbident, 
    grun.h_gem_id as h_gem_id,
    grun.egrid as egrid,
    v.vflz_id as vflz_id, 
    grun.gb_nummer as parzelle 
  from standorte v
  left join alma.bet on v.vflz_id = bet.vflz_id
  left join alma.bet_art using (bet_id)
  left join alma.grun using (grun_id)
  where not (grun.h_nb_id is null and grun.h_gem_id is null and grun.egrid is null and grun.gb_nummer is null)
  group by grun.h_nb_id, grun.h_gem_id, grun.egrid, v.vflz_id, grun.gb_nummer

),

-- saved parcels in xml form
parzellen_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5.Parzellenidentifikation",
        xmlelement(name "NBIdent", parzellen.nbident),
        xmlelement(name "Parzellennummer", parzellen.parzelle)
    ) as x_v15
from parzellen
where parzellen.nbident is not null and parzellen.parzelle is not null
order by parzellen.parzelle
),

--egrid in xml form
egrid_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5.EGRID_",
            xmlelement(name "value", parzellen.egrid)
        )
    as x_v15
from parzellen
where parzellen.egrid is not null
order by parzellen.parzelle
),



-- parcels from external data for all returned sites
parzellen_cache as (
  select 
    grun.h_nb_id as nbident, 
    grun.h_gem_id as h_gem_id,
    grun.egrid as egrid,
    v.vflz_id as vflz_id, 
    grun.gb_nummer as parzelle 
  from standorte v
  join alma.grun on st_intersects(v.wkb_geometry, grun.wkb_geometry)
  left join alma.h_gem on h_gem.bfs_nummer = grun.h_gem_id
  left join alma.h_nb on grun.h_nb_id = h_nb.h_nb_id
  where not (grun.h_nb_id is null and grun.h_gem_id is null and grun.egrid is null and grun.gb_nummer is null)
  group by grun.h_nb_id, grun.h_gem_id, grun.egrid, v.vflz_id, grun.gb_nummer
),

-- parcels in xml form
parzellen_cache_xml as (
select parzellen_cache.vflz_id,
        xmlelement(name "KbS_V1_5.Parzellenidentifikation",
        xmlelement(name "NBIdent", parzellen_cache.nbident),
        xmlelement(name "Parzellennummer", parzellen_cache.parzelle)
    ) as x_v15
from parzellen_cache
where parzellen_cache.nbident is not null and parzellen_cache.parzelle is not null
order by parzellen_cache.parzelle
),

-- egrid in xml form
egrid_cache_xml as (
select parzellen_cache.vflz_id,
        xmlelement(name "KbS_V1_5.EGRID_",
            xmlelement(name "value", parzellen_cache.egrid)
        )
    as x_v15
from parzellen_cache
where parzellen_cache.egrid is not null
order by parzellen_cache.parzelle
),



untersuchungsmassnahmen_pre_vfl as (
select massn.*
from (
      select tm.code_long, tm.ili_code, tm.ili_c_cli_id, v.vfl_id from alma_export.interlis_task_mapping_v tm join alma.vflz v on v.c_vflz_unterstand = tm.a4w_code
) massn
join standorte s on massn.vfl_id = s.vfl_id
),

untersuchungsmassnahmen_vfl as (
select
    s.vfl_id, up.code_long, up.ili_code, up.ili_c_cli_id
from untersuchungsmassnahmen_pre_vfl up
join standorte s on up.vfl_id = s.vfl_id
union
-- provide untmassn1 if no other untersuchungsmassnahme is available
select s.vfl_id, 'UntMassn1' as code_long, 'UM1' as ili_code, 20023 as ili_c_cli_id
from standorte s
    where s.vfl_id not in (select vfl_id from untersuchungsmassnahmen_pre_vfl)
    ),

untersuchungsmassnahmen_xml_vfl as (
select um.vfl_id,
        xmlelement(name "KbS_V1_5.UntersMassn_",
        xmlelement(name "value", um.code_long)
    ) as x_v15
from untersuchungsmassnahmen_vfl um
),


untersuchungsmassnahmen_pre_vflz as (
select massn.*
from (
      select tm.code_long, tm.ili_code, tm.ili_c_cli_id, v.vfl_id, v.vflz_id from alma_export.interlis_task_mapping_v tm join alma.vflz v on v.c_vflz_unterstand = tm.a4w_code
) massn
join standorte s on massn.vflz_id = s.vflz_id
),

untersuchungsmassnahmen_vflz as (
select
    s.vflz_id, s.vfl_id, up.code_long, up.ili_code, up.ili_c_cli_id
from untersuchungsmassnahmen_pre_vflz up
join standorte s on up.vflz_id = s.vflz_id
union
-- provide untmassn1 if no other untersuchungsmassnahme is available
select s.vflz_id, s.vfl_id, 'UntMassn1' as code_long, 'UM1' as ili_code, 20023 as ili_c_cli_id
from standorte s
    where s.vflz_id not in (select vflz_id from untersuchungsmassnahmen_pre_vflz)
    ),



untersuchungsmassnahmen_xml_vflz as (
select um.vflz_id,
        xmlelement(name "KbS_V1_5.UntersMassn_",
        xmlelement(name "value", um.code_long)
    ) as x_v15
from untersuchungsmassnahmen_vflz um
),


-- sites in xml form

standorte_xml_v15 as (
    select xmlelement(name "KbS_V1_5.Belastete_Standorte.Belasteter_Standort",
          xmlattributes(standorte.stao_tid as "TID"),
          xmlelement(name "Katasternummer", standorte.vflz_combined_id_kt),
          case when geoportallinks.permalink_geoportal is not null then
            xmlelement(name "URL_Standort", 
                xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",
                    xmlelement(name "LocalisedText",
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'de'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=de'))
                        ), 
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",   
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                     then xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=rm'))
                                    else xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=fr')) end
                        ),
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'it'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=it'))
                        )
                    )
                )
            )
          else 
            xmlelement(name "URL_Standort", geoportallinks.permalink_geoportal)
          end,
          case when standorte.wkb_geometry is not null then
              case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                  xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              else
                  xmlelement(name "Geo_Lage_Polygon", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              end
          else
              xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
          end,
          case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.parzellen' and locale = 'de')= 'cache' then
              case
               when exists(select vflz_id from parzellen_cache_xml where parzellen_cache_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x_v15) from parzellen_cache_xml where parzellen_cache_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
              end
            else
              case
               when exists(select vflz_id from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x_v15) from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
              end
          end,
          case
               when exists(select vflz_id from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "EGRID", 
                        (select xmlagg(x_v15) from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id)
                    )
                else
                    xmlcomment('EGRID not available')
          end, 
          xmlelement(name "Standorttyp", standorte.staotyp),
          xmlelement(name "InBetrieb", standorte.in_betrieb),
          case
               when standorte.deponietyp is not null then
                  xmlelement(name "Deponietyp", xmlelement(name "KbS_V1_5.Deponietyp_",
                        xmlelement(name "value", standorte.deponietyp)
                        )
                  )
                else
                    xmlcomment('Deponietyp not available')
          end,
          case
                when standorte.nachsorge is not null then
                    xmlelement(name "Nachsorge", standorte.nachsorge)
                else
                    xmlcomment('Nachsorge not available')
          end,
          case 
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'alle nach standortversionen' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x_v15) from untersuchungsmassnahmen_xml_vfl where untersuchungsmassnahmen_xml_vfl.vfl_id = standorte.vfl_id))
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'aktuellste' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x_v15) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
                else 
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x_v15) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
          end,
          xmlelement(name "StatusAltlV", standorte.statusaltlv),
          xmlelement(name "Ersteintrag", standorte.date_ersteintrag::date),
          xmlelement(name "LetzteAnpassung", standorte.date_letzteanpassung::date),
          xmlelement(name "URL_KbS_Auszug",                                                                                                                                                               
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                          
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'de'),                                                                                                                                                
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     ),                                                                                                                                                                                    
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                        
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                   
                     xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                                  
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     )                                                                                                                                                                                     
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
           ),   
          xmlcomment('Bemerkung not available'),
          xmlelement(name "ZustaendigkeitKataster",
            xmlattributes(
                standorte.zb_tid as "REF"
            )
          )
      ) as x
    from standorte
    join geoportallinks on geoportallinks.vflz_id = standorte.vflz_id
    order by standorte.stao_tid
),


-- org
zustaendige_behoerde as (
select
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid, /* this id also gets build in the standorte with-clause*/
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'de') as behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'fr') as behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'it') as behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'de') as url_behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_rm,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'it') as url_behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_uid' and locale = 'de') as uid,
        (select'interlis_settings.katastername') as katastername,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_kbs_auszug' and locale = 'de') as url_webgis
),

-- org as xml
zustaendige_behoerde_xml as (
    select 
    xmlelement(name "KbS_V1_5.Belastete_Standorte.ZustaendigkeitKataster",
      xmlattributes(zustaendige_behoerde.zb_tid as "TID"),
      xmlelement(name "Zustaendige_Behoerde", 
        xmlelement(name "LocalisationCH_V1.MultilingualText",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                          
      ),

      xmlelement(name "URL_Behoerde",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         ), 

      xmlelement(name "UID", zustaendige_behoerde.uid),
      xmlelement(name "Katastername",
            alma_export.interlis_kbs_localisedtext_t(zustaendige_behoerde.katastername, 
            array['de',
                    case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                        then 'rm' 
                    else 'fr' end,
                    'it'
                ])
      ),

      xmlelement(name "URL_Kataster",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=de'))                                                                                                     
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                  then xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=rm'))                                                                                       
                                 else xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=fr')) end                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=it'))                                                                                                     
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         )   


    ) as x_v15
    from zustaendige_behoerde
)

-- assembling of the finished xml document according to the interlis schema
select xmlelement(name "TRANSFER", xmlattributes('http://www.interlis.ch/INTERLIS2.3' as xmlns),
    xmlelement(name "HEADERSECTION",
        xmlattributes('alma' as "SENDER", '2.3' as "VERSION"),
          xmlelement(name "MODELS", -- need to add all used models by hand
              xmlelement(name "MODEL",xmlattributes('CoordSys' as "NAME",'2015-11-24' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('InternationalCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Localisation_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('LocalisationCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Dictionaries_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('DictionariesCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Units' as "NAME",'2012-02-20' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('GeometryCHLV95_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('KbS_V1_5' as "NAME",'2021-10-15' as "VERSION",'https://models.geo.admin.ch/BAFU' as "URI"))
          )
    ),
   
    xmlelement(name "DATASECTION",
        xmlelement(name "KbS_V1_5.Belastete_Standorte",-- there is no attribute that could server as a bucket-identifier. so we generate an artiffical one.
            xmlattributes((select bid from bidprops) as "BID"),
                ( select xmlagg(x_v15) from zustaendige_behoerde_xml),
                ( select xmlagg(x) from standorte_xml_v15)
        )
    )

);

$_$;

comment on function alma_export.interlis_kbs_v1_5 is 'Generieren der INTERLIS XTF Datei für die KBS Version 1.5. 
    Der Export beinhaltet alle publizierten Standorte nach der Altlast Verordnung';



drop function if exists alma_export.oereb_localisedtext_t_v11(p_text text, p_locales text[]);

CREATE FUNCTION alma_export.oereb_localisedtext_t_v11(p_text text, p_locales text[]) RETURNS xml
    LANGUAGE plpgsql STABLE STRICT
    AS $$
declare
    result xml;
begin
    select xmlelement(name "LocalisationCH_V1.MultilingualText",
        xmlelement(name "LocalisedText",
            xmlagg(
                xmlelement(name "LocalisationCH_V1.LocalisedText",
                    xmlelement(name "Language", ls.locale ),
                    xmlelement(name "Text", alma.translate_code(p_text, ls.locale) )
                )
            )
          )
        ) into result lt
        from (
            select lower(locale) as locale
            from unnest(p_locales) p(locale)
            left join alma_export.interlis_language_ordering lo on lo.lang=lower(p.locale)
            order by coalesce(lo.sort_key, 1337)
        ) ls;
    return result;
end
$$;

comment on function alma_export.oereb_localisedtext_t_v11 is 'INTERLIS ÖREB XML Export für mehrsprachige Parameter';



drop function if exists alma_export.interlis_oereb_geometry_polygon_boundaries_internal(p_geom public.geometry);

create function alma_export.interlis_oereb_geometry_polygon_boundaries_internal(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare
    result xml;
    geom_type text;
begin
    geom_type := st_geometrytype(p_geom);
    if geom_type = 'ST_Polygon' then
        select xmlagg(geoxmltext::xml) into result
                from (
                    select xmlelement(name "BOUNDARY", geom)::text as geoxmltext
                        from  (
                            select alma_export.interlis_geometry_line(
                                st_ExteriorRing(p_geom)
                                ) as geom
                            union all
                            select alma_export.interlis_geometry_line(
                                ST_InteriorRingN(p_geom, generate_series(1,st_NumInteriorRings(p_geom)))
                                )
                        ) foo2
                ) foo;
    else
        raise 'unsupported geometry type: %', geom_type;
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_oereb_geometry_polygon_boundaries_internal is 'INTERLIS ÖREB XML Export für die richtige Reihenfolge der Punkte bei Ring-Polygonen Geometrien';



drop function if exists alma_export.interlis_oereb_geometry_multipolygon(p_geom public.geometry);


create function alma_export.interlis_oereb_geometry_multipolygon(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare
    result xml;
    geom_type text;
begin
    geom_type := st_geometrytype(p_geom);
    if geom_type = 'ST_MultiPolygon' then
        select xmlelement(name "SURFACE", xmlagg(geomxml)) into result
            from (
                select alma_export.interlis_oereb_geometry_polygon_boundaries_internal(
                    st_geometryn(p_geom, generate_series(1,st_numgeometries(p_geom)))
                ) as geomxml
            ) foo;
    else
        raise 'unsupported geometry type: %', geom_type;
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_oereb_geometry_multipolygon is 'INTERLIS ÖREB XML Export für Multipolygon Geometrien';



drop function if exists alma_export.interlis_oereb_geometry(p_geom public.geometry);

create function alma_export.interlis_oereb_geometry(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare
    result xml;
    geom_type text;
begin
/*
for a "documentation" how to read/write interlis xml geometries see the
iom library in the Gdal (1.10.0+) source tree in ogr/ogrsf_frmts/ili/iom
*/

    geom_type := st_geometrytype(p_geom);
    if geom_type = 'ST_Point' then
        result := alma_export.interlis_geometry_point(p_geom);
    elsif geom_type = 'ST_Line' or geom_type = 'ST_LineString' then
        result := alma_export.interlis_geometry_line(p_geom);
    elsif geom_type = 'ST_Polygon' then
        result := alma_export.interlis_geometry_polygon(p_geom);
     elsif geom_type = 'ST_MultiPolygon' then
        result := alma_export.interlis_oereb_geometry_multipolygon(p_geom);
    else
        raise 'unsupported geometry type: %', geom_type;
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_oereb_geometry is 'INTERLIS ÖREB XML Export für alle Geometrietypen';



drop function if exists alma_export.interlis_oereb_v2_0(p_vflz_ids integer[]);

create function alma_export.interlis_oereb_v2_0(p_vflz_ids integer[]) returns xml
    language sql
    as $_$

with bidprops as (
    select 
        'kbsOEREB' || msgstr as bid
    from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'
),

-- all sites of the list of vflz_ids
standorte as (
    select
        v.vflz_id,
        v.vfl_id,
        v.vflz_combined_id_kt,
        vflnr.c_org_kuerzel,
        v.dat_rechtskraft::date as date_ersteintrag,
        statusaltlv_mapping.code_long as statusaltlv_long,
        statusaltlv_mapping.ili_code as statusaltlv_ili_code,
        statusaltlv_mapping.ili_c_cli_id as statusaltlv_ili_c_cli_id,
        true as rechtsstatus,
        (st_dump(vflgeo.wkb_geometry)).geom as wkb_geometry,
        zentroid as wkb_point,
        -- artifficial transfer ids:
        (st_dump(vflgeo.wkb_geometry)).path[1] as laufnummer,
        (st_numgeometries(vflgeo.wkb_geometry)) as numgeom,
        'geom'||v.vflz_id::text as geom_tid,
        'geom'||v.vflz_id::text||'-'||(st_dump(vflgeo.wkb_geometry)).path[1] as geom_tid_laufnummer,
        v.c_vflz_vftyp,
        v.h_vflz_vftyp
    from alma.vflz v
    join alma.vflz_is_published_v vip on v.vflz_id = vip.vflz_id and vip.is_latest_published /* only published versions */
    join alma.vflgeo on vflgeo.vflz_id = v.vflz_id

    join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv

    join alma.bere on bere.vflz_id = v.vflz_id
    join alma_export.interlis_cod_mapping_v statusaltlv_mapping on statusaltlv_mapping.c_cli_id = bere.h_bere_res_abwbewe
        and statusaltlv_mapping.code = bere.c_bere_res_abwbewe
    where v.vfl_id in (
        select vfl_id from alma.vflz where vflz_id = any($1)
    )
    and vflnr.c_org_kuerzel in (
        select distinct trim(unnest(string_to_array(msgstr, ',')))
        from alma.translations
        where msgid in ('interlis_settings.aemter_vollzug', 'interlis_settings.amt_kuerzel')
            and locale = 'de'
            and msgstr is not null
            and msgstr != ''
    )
),


aemter as (
    select
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'de') as behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'fr') as behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'it') as behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'de') as url_behoerde,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_uid' and locale = 'de') as uid,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.katastername' and locale = 'de') as katastername,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_kbs_auszug' and locale = 'de') as url_webgis,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de') as org_id,
        'amt' || (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as tid,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'de') as web_link_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as web_link_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as web_link_rm,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'it') as web_link_it
),


thema as (
  select 
        owd.dokument_tid as tid,
        owd.beschreibung as code, 
        owd.titel_de as titel, 
        owd.titel_fr, 
        owd.titel_it, 
        owd.titel_rm, 
        owd.auszugindex
        from alma_export.interlis_oereb_weitere_dokumente owd      
),


wmsprops as (
    select
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.layername' and locale = 'de')  as layername,
        'dd' || (select msgstr from alma.translations s where s.msgid = 'interlis_settings.layername' and locale = 'de') as tid
),


darstellungsdienste as (
    select
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_verweiswms' and locale = 'de') as url_verweiswms_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_verweiswms' and locale = 'fr') as url_verweiswms_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_verweiswms' and locale = 'it') as url_verweiswms_it
),


legendeeintrag as (
    select
        symbol.legende_status as tid,
        symbol.code as code,
        symbol.c_cli_id as c_cli_id,
        symbol.symbol as binblbox,
        symbol.thema as thema,
        symbol.def_code as definition,
        symbol.artcodeliste as url_artcodeliste,
        symbol.geometrytype,
        (select tid from wmsprops) as darstellungsdienst
    from alma_export.interlis_symbol symbol where export = 'oereb2'
),


legendedarstellungsdienst as (
    select
        (select tid from wmsprops) as darstellungsdienst,
        symbol.legende_status as legende
    from alma_export.interlis_symbol symbol where export = 'oereb2'
),


eigentumsbeschraenkung as (
    select
        standorte.vflz_id,
        'eb' || standorte.vflz_id::text as tid,
        /* typ: OeREBKRM09.RechtsStatus  enum (inKraft|laufendeAenderung) */
        case when standorte.rechtsstatus then 'inKraft' else 'laufendeAenderung' end as rechtsstatus,
        standorte.date_ersteintrag,
        (select tid from wmsprops) as darstellungsdienste_tid,
        aemter.tid as aemter_tid,
        legendeeintrag.tid as legende
        
    from standorte
    join aemter on aemter.org_id = standorte.c_org_kuerzel
    join legendeeintrag on standorte.statusaltlv_ili_code = legendeeintrag.code and GeometryType(standorte.wkb_geometry)= legendeeintrag.geometrytype
    group by standorte.vflz_id, 'eb' || standorte.vflz_id::text, standorte.date_ersteintrag, 
    aemter.tid, (select tid from wmsprops), standorte.rechtsstatus, legendeeintrag.tid
),


wmsprops_2 as (
    select
    (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_rechtsvorschrift_textimweb' and locale = 'de') as url_geoportal
),


geoportallinks as (
    select
        standorte.vflz_id,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'standortnummer' 
            then wmsprops_2.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text)) || '&lang=de'
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops_2.url_geoportal || 'Y=' || st_x(standorte.wkb_point)::text || '&X=' || st_y(standorte.wkb_point)::text || '&lang=de' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops_2.url_geoportal || 'map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text || '&lang=de' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops_2.url_geoportal || '&c=' || st_x(standorte.wkb_point)::text || ',' || st_y(standorte.wkb_point)::text || '&lang=de' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops_2.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops_2.url_geoportal || '&lang=de'
        end as permalink_geoportal_de,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'standortnummer' then
          wmsprops_2.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text)) || '&lang=fr'
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops_2.url_geoportal || 'Y=' || st_x(standorte.wkb_point)::text || '&X=' || st_y(standorte.wkb_point)::text || '&lang=fr' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops_2.url_geoportal || 'map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text || '&lang=fr' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops_2.url_geoportal || '&c=' || st_x(standorte.wkb_point)::text || ',' || st_y(standorte.wkb_point)::text || '&lang=fr' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops_2.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops_2.url_geoportal || '&lang=fr'
        end as permalink_geoportal_fr,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'standortnummer' then
          wmsprops_2.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text)) || '&lang=rm'
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops_2.url_geoportal || 'Y=' || st_x(standorte.wkb_point)::text || '&X=' || st_y(standorte.wkb_point)::text || '&lang=rm' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops_2.url_geoportal || 'map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text || '&lang=rm' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops_2.url_geoportal || '&c=' || st_x(standorte.wkb_point)::text || ',' || st_y(standorte.wkb_point)::text || '&lang=rm' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops_2.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops_2.url_geoportal || '&lang=rm'
        end as permalink_geoportal_rm,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'standortnummer' then
          wmsprops_2.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text)) || '&lang=it'
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops_2.url_geoportal || 'Y=' || st_x(standorte.wkb_point)::text || '&X=' || st_y(standorte.wkb_point)::text || '&lang=it' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops_2.url_geoportal || 'map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text || '&lang=it' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops_2.url_geoportal || '&c=' || st_x(standorte.wkb_point)::text || ',' || st_y(standorte.wkb_point)::text || '&lang=it' 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_textimweb_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops_2.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops_2.url_geoportal || '&lang=it'
        end as permalink_geoportal_it
    from standorte, wmsprops_2
),


dokument as (
    select
        standorte.vflz_id,
        'rv'||standorte.vflz_id::text as tid,
        'Rechtsvorschrift' as typ,
        standorte.vflz_combined_id_kt,
        gpl.permalink_geoportal_de as web_link_de,
        gpl.permalink_geoportal_fr as web_link_fr,
        gpl.permalink_geoportal_rm as web_link_rm,
        gpl.permalink_geoportal_it as web_link_it,
        '1' as auszugindex,
            /* typ: OeREBKRM09.RechtsStatus  enum (inKraft|laufendeAenderung) */
        case when standorte.rechtsstatus then 'inKraft' else 'laufendeAenderung' end as rechtsstatus,
        standorte.date_ersteintrag::date,
        aemter.katastername,
        aemter.tid as aemter_tid
    from standorte
    join aemter on aemter.org_id = standorte.c_org_kuerzel
    join geoportallinks gpl on gpl.vflz_id = standorte.vflz_id
    group by standorte.vflz_id, gpl.permalink_geoportal_de, gpl.permalink_geoportal_fr, gpl.permalink_geoportal_rm, gpl.permalink_geoportal_it, standorte.rechtsstatus, standorte.date_ersteintrag::date, 
    aemter.katastername,aemter.tid, standorte.vflz_combined_id_kt
),


-------------------------------------------------------------------------------------------------------------------
-- xml queries
-------------------------------------------------------------------------------------------------------------------


aemter_xml as (
    select 
  xmlelement(name "OeREBKRM_V2_0.Amt.Amt",
                xmlattributes(aemter.tid as "TID"),
                xmlelement(name "Name", 
                    xmlelement(name "LocalisationCH_V1.MultilingualText",
                        xmlelement(name "LocalisedText",
                            xmlelement(name "LocalisationCH_V1.LocalisedText",
                                xmlelement(name "Language", 'de'),
                                xmlelement(name "Text", aemter.behoerde_de)
                            ), 
                            xmlelement(name "LocalisationCH_V1.LocalisedText",   
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                                 then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                 then xmlelement(name "Text", aemter.behoerde_fr)
                                else xmlelement(name "Text", aemter.behoerde_fr) end
                            ),
                            xmlelement(name "LocalisationCH_V1.LocalisedText",
                                xmlelement(name "Language", 'it'),
                                xmlelement(name "Text", aemter.behoerde_it)
                            )
                        )
                    )
                ),
                
                xmlelement(name "AmtImWeb", 
                    xmlelement(name "OeREBKRM_V2_0.MultilingualUri",
                        xmlelement(name "LocalisedText",
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",
                                xmlelement(name "Language", 'de'),
                                xmlelement(name "Text", aemter.web_link_de)
                            ), 
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",   
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                 then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                 then xmlelement(name "Text", aemter.web_link_fr)
                                else xmlelement(name "Text", aemter.web_link_fr) end
                            ),
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",
                                xmlelement(name "Language", 'it'),
                                xmlelement(name "Text", aemter.web_link_it)
                            )
                        )
                    )
                ),
                xmlelement(name "UID", aemter.uid)
  ) as x_v2
    from aemter
),


thema_xml as (
  select 
        xmlelement(name "OeREBKRMkvs_V2_0.Thema.Thema",
                xmlattributes(thema.tid as "TID"),
                xmlelement(name "Code", thema.code), 
                xmlelement(name "Titel", alma_export.oereb_localisedtext_t_v11(thema.titel, 
                  array['de',
                    case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                        then 'rm' 
                    else 'fr' end,
                    'it'
                  ]
                  )),
                xmlelement(name "AuszugIndex", thema.auszugindex) 
        ) as x_v2
    from thema
),


darstellungsdienste_xml as (
    select 
        xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur.DarstellungsDienst",
                xmlattributes(wmsprops.tid as "TID"),
                xmlelement(name "VerweisWMS",
                    xmlelement(name "OeREBKRM_V2_0.MultilingualUri",
                        xmlelement(name "LocalisedText",
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",
                                xmlelement(name "Language", 'de'),
                                xmlelement(name "Text", darstellungsdienste.url_verweiswms_de)
                                
                            ), 
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",   
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                 then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                 then xmlelement(name "Text", darstellungsdienste.url_verweiswms_fr)
                                else xmlelement(name "Text", darstellungsdienste.url_verweiswms_fr)
                                 end
                            ),
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",
                                xmlelement(name "Language", 'it'),
                                xmlelement(name "Text", darstellungsdienste.url_verweiswms_it)
                                
                            )
                        )
                    )

                )                
        ) as x_v2
    from wmsprops, darstellungsdienste
    group by wmsprops.tid, darstellungsdienste.url_verweiswms_de, darstellungsdienste.url_verweiswms_fr, darstellungsdienste.url_verweiswms_it
),


legendeeintrag_xml as (
    select
        xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur.LegendeEintrag", xmlattributes(legendeeintrag.tid as "TID"),
          xmlelement(name "Symbol",
            xmlelement(name "BINBLBOX",legendeeintrag.binblbox)),
          xmlelement(name "LegendeText", alma_export.oereb_localisedtext_t_v11(alma.msgid_code(legendeeintrag.c_cli_id, legendeeintrag.code), 
            array['de',
                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                    then 'rm' 
                else 'fr' end,
                'it'
              ]
            )),
          xmlelement(name "ArtCode", legendeeintrag.definition),
          xmlelement(name "ArtCodeliste", legendeeintrag.url_artcodeliste),
          xmlelement(name "Thema", legendeeintrag.thema),
          xmlelement(name "DarstellungsDienst", xmlattributes(legendeeintrag.darstellungsdienst as "REF"))
        )
        as x_v2
    from legendeeintrag
),


legendedarstellungsdienst_xml as (
select
        xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur.LegendeDarstellungsdienst", 
            xmlelement(name "DarstellungsDienst", xmlattributes(legendedarstellungsdienst.darstellungsdienst as "REF")),
            xmlelement(name "Legende", xmlattributes(legendedarstellungsdienst.legende as "REF"))
          
        )
        as x_v2
    from legendedarstellungsdienst
),


eigentumsbeschraenkung_xml as (
    select 
        xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur.Eigentumsbeschraenkung", xmlattributes(eb.tid as "TID"),
                xmlelement(name "Rechtsstatus", eb.rechtsstatus),
                xmlelement(name "publiziertAb", eb.date_ersteintrag::date),
                xmlelement(name "DarstellungsDienst", xmlattributes( eb.darstellungsdienste_tid as "REF")),
                xmlelement(name "Legende", xmlattributes(eb.legende as "REF")),
                xmlelement(name "ZustaendigeStelle", xmlattributes( eb.aemter_tid as "REF"))
        ) as x_v2
    from eigentumsbeschraenkung eb
),


dokument_xml as (
    select 
        xmlelement(name "OeREBKRM_V2_0.Dokumente.Dokument", xmlattributes(dokument.tid as "TID"),
                xmlelement(name "Typ", dokument.typ),
                xmlelement(name "Titel", alma_export.oereb_localisedtext_t_v11(dokument.vflz_combined_id_kt, 
                  array['de',
                    case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                      then 'rm' 
                    else 'fr' end,
                    'it'
                  ]
                )),
                xmlelement(name "TextImWeb", 
                    xmlelement(name "OeREBKRM_V2_0.MultilingualUri",
                        xmlelement(name "LocalisedText",
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",
                                xmlelement(name "Language", 'de'),
                                xmlelement(name "Text", dokument.web_link_de)
                            ), 
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",   
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                 then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                                case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                 then xmlelement(name "Text", dokument.web_link_rm)
                                else xmlelement(name "Text", dokument.web_link_fr) end
                            ),
                            xmlelement(name "OeREBKRM_V2_0.LocalisedUri",
                                xmlelement(name "Language", 'it'),
                                xmlelement(name "Text", dokument.web_link_it)
                            )
                        )
                    )
                ),
                xmlelement(name "AuszugIndex", dokument.auszugindex),
                xmlelement(name "Rechtsstatus", dokument.rechtsstatus),
                xmlelement(name "publiziertAb", dokument.date_ersteintrag::date),
                xmlelement(name "ZustaendigeStelle", xmlattributes(dokument.aemter_tid as "REF"))
        ) as x_v2
    from dokument
),


geometrie_xml as (
    select 
        xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur.Geometrie",
                xmlattributes(case when standorte.numgeom > 1 then standorte.geom_tid_laufnummer 
            else standorte.geom_tid end as "TID"),
                case when standorte.wkb_geometry is not null then
                    case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                        xmlelement(name "Punkt", alma_export.interlis_oereb_geometry(ST_Transform((standorte.wkb_geometry), 2056)))
                    else
                        xmlelement(name "Flaeche", alma_export.interlis_oereb_geometry(ST_Transform((standorte.wkb_geometry), 2056)))
                    end
                else
                    xmlelement(name "Punkt", alma_export.interlis_oereb_geometry(ST_Transform((standorte.wkb_geometry), 2056)))
                end,
                xmlelement(name "Rechtsstatus",
                    /* typ: OeREBKRM09.RechtsStatus  enum (inKraft|laufendeAenderung) */
                    case when standorte.rechtsstatus then 'inKraft' else 'laufendeAenderung' end
                ),
                xmlelement(name "publiziertAb", standorte.date_ersteintrag::date),
                xmlelement(name "Eigentumsbeschraenkung",
                    xmlattributes( eb.tid as "REF")
                )
        ) as x_v2
    from standorte
    join eigentumsbeschraenkung eb on eb.vflz_id = standorte.vflz_id
),

hinweisvorschrift_xml as (
    select 
  xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur.HinweisVorschrift",
    xmlelement(name "Eigentumsbeschraenkung", xmlattributes(eb.tid as "REF") ),
    xmlelement(name "Vorschrift", xmlattributes(dokument.tid as "REF") )
  ) as x_v2
    from eigentumsbeschraenkung eb
    join dokument  on dokument.vflz_id = eb.vflz_id
),


eigentumsbeschraenkunglegende_xml as (
    select 
  xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur.EigentumsbeschraenkungLegende",
    xmlelement(name "Eigentumsbeschraenkung", xmlattributes(eb.tid as "REF") ),
    xmlelement(name "Legende", xmlattributes(legendeeintrag.tid as "REF") )
  ) as x_v2
    from eigentumsbeschraenkung eb
    join standorte on eb.vflz_id = standorte.vflz_id
    join legendeeintrag on standorte.statusaltlv_ili_code = legendeeintrag.code 
        and GeometryType(standorte.wkb_geometry)= legendeeintrag.geometrytype
)


-------------------------------------------------------------------------------------------------------------------
-- assembling of the finished xml document according to the interlis schema
-------------------------------------------------------------------------------------------------------------------


select xmlelement(name "TRANSFER", xmlattributes('http://www.interlis.ch/INTERLIS2.3' as xmlns),
   xmlelement(name "HEADERSECTION",
        xmlattributes('alma' as "SENDER", '2.3' as "VERSION"),
    xmlelement(name "MODELS",
        xmlelement(name "MODEL",xmlattributes('CoordSys' as "NAME",'2015-11-24' as "VERSION",'https://www.interlis.ch/models' as "URI")),
        xmlelement(name "MODEL",xmlattributes('CatalogueObjects_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('CatalogueObjectTrees_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('InternationalCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('Localisation_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('LocalisationCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('Dictionaries_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('DictionariesCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('Units' as "NAME",'2012-02-20' as "VERSION",'https://www.interlis.ch/models' as "URI")),
        xmlelement(name "MODEL",xmlattributes('OeREBKRM_V2_0' as "NAME",'2021-04-14' as "VERSION",'https://models.geo.admin.ch/V_D/OeREB/' as "URI") ),
        xmlelement(name "MODEL",xmlattributes('CHAdminCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('AdministrativeUnits_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('AdministrativeUnitsCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('GeometryCHLV03_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('GeometryCHLV95_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
        xmlelement(name "MODEL",xmlattributes('OeREBKRMkvs_V2_0' as "NAME",'2021-04-14' as "VERSION",'https://models.geo.admin.ch/V_D/OeREB/' as "URI")),
        xmlelement(name "MODEL",xmlattributes('OeREBKRMtrsfr_V2_0' as "NAME",'2021-04-14' as "VERSION",'https://models.geo.admin.ch/V_D/OeREB/' as "URI"))
    )
   ),
  xmlelement(name "DATASECTION",
    xmlelement(name "OeREBKRMtrsfr_V2_0.Transferstruktur",
         xmlattributes(( select bid from bidprops) as "BID"),
         --xmlcomment('OeREBKRM_V2_0.Amt.Amt'),
         (select xmlagg(x_v2) from aemter_xml),
         --xmlcomment('OeREBKRMtrsfr_V2_0.Transferstruktur.DarstellungsDienst'),
         (select xmlagg(x_v2) from darstellungsdienste_xml),
         --xmlcomment('OeREBKRMtrsfr_V2_0.Transferstruktur.LegendeEintrag'),
         (select xmlagg(x_v2) from legendeeintrag_xml),
         -- xmlcomment('OeREBKRMtrsfr_V2_0.Transferstruktur.Eigentumsbeschraenkung'),
         (select xmlagg(x_v2) from eigentumsbeschraenkung_xml),
         --xmlcomment('OeREBKRM_V2_0.Dokumente.Dokument'),
         (select xmlagg(x_v2) from dokument_xml),
         --xmlcomment('OeREBKRMtrsfr_V2_0.Transferstruktur.Geometrie'),
         (select xmlagg(x_v2) from geometrie_xml),
         --xmlcomment('OeREBKRMtrsfr_V2_0.Transferstruktur.HinweisVorschrift'),
         (select xmlagg(x_v2) from hinweisvorschrift_xml)
    )
    )
);

$_$;

comment on function alma_export.interlis_oereb_v2_0 is 'Generieren der INTERLIS XTF Datei für die ÖREB Version 2.0. 
    Der Export beinhaltet alle publizierten Standorte nach der Altlast Verordnung';



drop aggregate if exists alma_export.commacat_all(text) cascade;
drop function if exists  alma_export.commacat(acc text, instr text);

create function alma_export.commacat(acc text, instr text) returns text
    language plpgsql
    as $$
  begin
    if acc is null or acc = '' then
      return instr;
    elsif instr is null or instr='' then
      return acc;
    else
      return acc || ', ' || instr;
    end if;
  end;
$$;

comment on function alma_export.commacat is 'Verkettung von Werten mit Komma getrennt.';

create aggregate alma_export.commacat_all(text) (
    sfunc = alma_export.commacat,
    stype = text,
    initcond = ''
);



drop function if exists alma_export.bafu_update_data();

create function alma_export.bafu_update_data() returns void
    language plpgsql
    as $$
declare
    this_locale text;
begin
    raise notice 're-creating contents of alma_export.bafu table';
    truncate alma_export.wfs_bafu;
    perform setval('alma_export.bafu_mapserver_id', 1); -- reset the sequence to prevent growth of this key.

    for this_locale in select unnest(array['de','fr','it']) as locale 
                loop
        insert into alma_export.wfs_bafu (
              vflz_id,
              staonr,
              staobezeichnung,
              staotyp,
              vollzug,
              gemeinde_bfs,
              gemeinde,
              kanton,
              x_koordinate ,
              y_koordinate ,
              wkb_geometry ,
              betrieb_branchen ,
              betrieb_zeitraum ,
              ablag_zeitraum ,
              ablag_gesamtvol  ,
              ablag_stoffe ,
              unfall_zeitpunkt ,
              unfall_stoffe ,
              vorkommnisse ,
              beurteilung ,
              umweltschutzmassnahmen ,
              gefaehrdete_umweltbereiche ,
              festgestellte_einwirkungen ,
              gewaesserschutzbereich ,
              gewaesserschutzzone ,
              ersteintrag_datum ,
              publikation_datum ,
              untersuchungsstand ,
              sanierungsziele ,
              priorisierung_sanierung ,
              priorisierung_untersuchung,
              locale
            )

         select
            v.vflz_id,
            v.vflz_combined_id_kt as staonr,
            v.bezeichnung as staobezeichnung,
            alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), this_locale) as staotyp,
            alma.translate_code(alma.msgid_code(26031, v.c_org_kuerzel), this_locale) as vollzug,
            v.h_gem_id as gemeinde_bfs,
            h_gem.gemeinde,
            h_gem.c_kanton as kanton,
            st_x(v.zentroid) as x_koordinate,
            st_y(v.zentroid) as y_koordinate,
            case when st_geometrytype(vflgeo.wkb_geometry) = 'st_point' then st_buffer(vflgeo.wkb_geometry, 10) else vflgeo.wkb_geometry end as wkb_geometry,
            betrieb_props.betrieb_branchen,
            betrieb_props.betrieb_zeitraum,
            ablag1_props.ablag_zeitraum,
            ablag1_props.ablag_gesamtvol,
            ablag2_props.ablag_stoffe,
            unfall_props.unfall_zeitpunkt,
            unfall_props.unfall_stoffe,
            vorkommnisse.vorkommnisse,
            alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), this_locale) as beurteilung,
            umweltschutzmassnahmen.umweltschutzmassnahmen,
            umweltbereiche.gefaehrdete_umweltbereiche,
            umweltbereiche.festgestellte_einwirkungen,
            alma.translate_code(alma.msgid_code(v.h_vflz_gws_bereich, v.c_vflz_gws_bereich), this_locale) as gewaesserschutzbereich,
            alma.translate_code(alma.msgid_code(v.h_vflz_gws_zone, v.c_vflz_gws_zone), this_locale) as gewaesserschutzzone,
            ersteintrag.ersteintrag_datum,
            to_char(vip.dat_latest_published, 'dd.mm.yyyy')::text as publikation_datum,
            alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), this_locale) as untersuchungsstand,
            sanierung.sanierungsziele,
            alma.translate_code(alma.msgid_code(bere.h_bere_prio_sanier, bere.c_bere_prio_sanier), this_locale)::int as priorisierung_sanierung,
            alma.translate_code(alma.msgid_code(bere.h_bere_prio_untersuch, bere.c_bere_prio_untersuch), this_locale)::int as priorisierung_untersuchung,
            this_locale as locale

        from alma.vflz v
        join alma.vflnr on (vflnr.vflz_id = v.vflz_id) and vflnr.aktiv = true
        join alma.vflz_is_published_v vip on (vip.vflz_id = v.vflz_id) and vip.is_latest_published
        join alma.bere bere on bere.vflz_id = v.vflz_id 
		join alma.cod_kbsinfo ckbs on bere.h_bere_res_abwbewe = ckbs.h_bere_res_abwbewe and bere.c_bere_res_abwbewe = ckbs.c_bere_res_abwbewe and ckbs.belastet
        join alma.vflgeo on v.vflz_id = vflgeo.vflz_id

        -- restrict using the org configured in a4w
        --join alma_admin.settings stng on stng.value = vflnr.org_id::text
        --join alma_admin.setitem sit on sit.setitem_id = stng.setitem_id and sit.key in ('org', 'astra')

        left join alma.h_gem on h_gem.h_gem_id = v.h_gem_id
        left join (
            select intb.vflz_id,
                array_to_string(array_agg((intb.c_intb_bran::text || ' - '::text) || alma.translate_code(alma.msgid_code(intb.h_intb_bran, intb.c_intb_bran), 'de'::text)), e'\n') as betrieb_branchen,
                coalesce(to_char(min(intb.intb_vonbetrieb)::date, 'dd.mm.yyyy')::text, alma.translate_code('unbekannt', this_locale)) || ' ' || alma.translate_code('bis', this_locale) || ' ' || coalesce(to_char(max(intb.intb_bisbetrieb)::date, 'dd.mm.yyyy')::text, alma.translate_code('heute', this_locale)) as betrieb_zeitraum
            from alma.intb
            group by intb.vflz_id
        ) betrieb_props on betrieb_props.vflz_id = v.vflz_id and v.c_vflz_vftyp = '02'

        left join (
            select inta.vflz_id,
                coalesce(to_char(min(inta.inta_ablag_von)::date, 'dd.mm.yyyy')::text, alma.translate_code('unbekannt', this_locale)) || ' ' || alma.translate_code('bis', this_locale) || ' ' || (case
                        when bool_or(inta.zeitraum_bisheute) then alma.translate_code('heute', this_locale)
                        else coalesce(to_char(max(inta.inta_ablag_bis)::date, 'dd.mm.yyyy')::text, alma.translate_code('unbekannt', this_locale))
                      end) as ablag_zeitraum,
                sum(inta.inta_vol_kompartiment) as ablag_gesamtvol
            from alma.inta
            group by inta.vflz_id
        ) ablag1_props on ablag1_props.vflz_id = v.vflz_id and v.c_vflz_vftyp = '01'

        left join (
            select inta.vflz_id,
                array_to_string(array_agg(alma.translate_code(alma.msgid_code(kksk.h_kksk_stoffkl, kksk.c_kksk_stoffkl), this_locale) || coalesce(': ' || alma.translate_code(alma.msgid_code(kksg.h_kksg_stoffgrp, kksg.c_kksg_stoffgrp), this_locale), '')), e'\n') as ablag_stoffe
            
	        from alma.inta
	        left join alma.kksk on kksk.inta_id = inta.inta_id
	        left join alma.kksg on kksk.kksk_id = kksg.kksk_id
	        group by inta.vflz_id
            
        ) ablag2_props on ablag2_props.vflz_id = v.vflz_id and v.c_vflz_vftyp = '01'

        left join (
            select intu.vflz_id,
                alma_export.commacat_all(case when intu.zeitraum_jahr then to_char(intu_unfallvon, 'yyyy') else to_char(intu_unfallvon, 'dd.mm.yyyy') end) as unfall_zeitpunkt,
                array_to_string(array_agg(alma.translate_code(alma.msgid_code(inum.h_inum_stoffe, inum.c_inum_stoffe), this_locale) || coalesce(': ' || alma.translate_code('restmenge',this_locale) || ' ' || nullif(inum_stoffmng, 0)::text || ' ' || alma.translate_code('liter', this_locale), '')), e'\n') as unfall_stoffe
            from alma.intu
            join alma.inum on inum.intu_id = intu.intu_id
            group by intu.vflz_id
        ) unfall_props on unfall_props.vflz_id = v.vflz_id and v.c_vflz_vftyp = '03'

        left join (
            select veen.vflz_id,
                array_to_string(array_agg(coalesce(alma.translate_code(alma.msgid_code(veen.h_veen_natuerlich, veen.c_veen_natuerlich), this_locale) || ': ', '') || coalesce(bem.bem, '')), e'\n') as vorkommnisse
            from alma.veen
            left join alma.bem bem on bem.key_value = veen.veen_id and bem.public 
			left join alma.bemgrp bg ON bg.bemgrp_id = bem.bemgrp_id and bg.bemgrp = 'veen.veen_id'
            group by veen.vflz_id
        ) vorkommnisse on vorkommnisse.vflz_id = v.vflz_id

        left join (
            select mass.vflz_id,
                 array_to_string(array_agg(alma.translate_code(alma.msgid_code(mass.h_massnahme, mass.c_massnahme), this_locale) || coalesce(': ' || alma.translate_code('erledigt am', this_locale) || ' ' || to_char(mass.dat_massnahme, 'dd.mm.yyyy')::text, '')), e'\n') as umweltschutzmassnahmen
            from alma.mass
            group by mass.vflz_id
        ) umweltschutzmassnahmen on umweltschutzmassnahmen.vflz_id = v.vflz_id

        left join (
            select vfus.vflz_id,
                array_to_string(array_agg(alma.translate_code(alma.msgid_code(vfus.h_vfus_art_schaden, vfus.c_vfus_art_schaden), this_locale)), e'\n') as gefaehrdete_umweltbereiche,
                array_to_string(array_agg(alma.translate_code(alma.msgid_code(vfus.h_vfus_schaeden, vfus.c_vfus_schaeden), this_locale)), e'\n') as festgestellte_einwirkungen
            from alma.vfus
            group by vfus.vflz_id
        ) umweltbereiche on umweltbereiche.vflz_id = v.vflz_id

        join (
            select vflz.vfl_id,
                to_char(min(dat_publizieren)::date, 'dd.mm.yyyy')::text as ersteintrag_datum
            from alma.vflz
            where vflz.publizieren
            group by vflz.vfl_id
        ) ersteintrag on ersteintrag.vfl_id = v.vfl_id

        left join (
            select sani.vflz_id,
                array_to_string(array_agg(alma.translate_code(alma.msgid_code(sani.h_saniziel, sani.c_saniziel), this_locale)), e'\n') as sanierungsziele
            from alma.sani
            group by sani.vflz_id
        ) sanierung on sanierung.vflz_id = v.vflz_id

        where vflnr.aktiv
        ;

    end loop;
end
$$;

comment on function alma_export.bafu_update_data is 'Aktualisierung der Daten für die Datenabgabe als WFS an das BAFU.';



drop function if exists alma_export.geoportal_fr_update_data();

create function alma_export.geoportal_fr_update_data() returns void
    language plpgsql
    as $$
    declare

    begin
        drop table if exists alma_export.geoportal_fr;
        create table alma_export.geoportal_fr
        as select * 
        from alma_export.geoportal_fr_v;
    end;
$$;

comment on function alma_export.geoportal_fr_update_data is 'Aktualisierung der Daten für die Datenabgabe als WFS an das Geoportal Kanton FR.';



drop function if exists alma_export.interlis_be_geometry_polygon_boundaries_internal(p_geom public.geometry);

CREATE FUNCTION alma_export.interlis_be_geometry_polygon_boundaries_internal(p_geom public.geometry) RETURNS xml
    LANGUAGE plpgsql STRICT
    AS $$
 declare                                                                                                 
     result xml;                                                                                         
     geom_type text;                                                                                     
     geom_srid integer;                                                                                  
     geom_numintrings integer;                                                                           
 begin                                                                                                   
     geom_type := st_geometrytype(p_geom);                                                               
     geom_srid := st_srid(p_geom);                                                                       
     geom_numintrings := st_numinteriorring(p_geom);                                                     
     if geom_type = 'ST_Polygon' and geom_srid = 2056 and geom_numintrings < 1 then                      
     select xmlagg(geoxmltext::xml) into result                                                          
                 from (                                                                                  
                     select xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.PolygonStructure",             
                             xmlelement(name "Polygon",                                                  
                             xmlelement(name "SURFACE",                                                  
                             xmlelement(name "BOUNDARY", geom))))::text as geoxmltext                    
                         from  (                                                                         
                             select alma_export.interlis_geometry_line(                                          
                                 st_ExteriorRing(p_geom)                                                 
                                 ) as geom                                                               
                             union all                                                                   
                             select alma_export.interlis_geometry_line(                                          
                                 ST_InteriorRingN(p_geom, generate_series(1,st_NumInteriorRings(p_geom)))
                                 )                                                                       
                         ) foo2                                                                          
                 ) foo;                                                                                  
     elsif geom_type = 'ST_Polygon' and geom_srid = 2056 and geom_numintrings > 0 then                   
     select xmlagg(geoxmltext::xml) into result                                                          
                 from (                                                                                  
                     select xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.PolygonStructure",             
                             xmlelement(name "Polygon",                                                  
                             xmlelement(name "SURFACE", geom)))::text as geoxmltext                      
                         from  (                                                                         
                             select alma_export.interlis_geometry_polygon_boundaries_internal(p_geom) as geom    
                         ) foo2                                                                          
                 ) foo;                                                                                  
                                                                                                         
     elsif geom_type != 'ST_Polygon' then                                                                
         raise 'unsupported geometry type: %', geom_type;                                                
     else                                                                                                
         raise 'unsupported geometry srid: %', geom_srid;                                                
     end if;                                                                                             
     return result;                                                                                      
 end
$$;

comment on function alma_export.interlis_be_geometry_polygon_boundaries_internal is '';



drop function if exists alma_export.interlis_be_geometry_multipolygon(p_geom public.geometry);

create function alma_export.interlis_be_geometry_multipolygon(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
 declare                                                                                           
     result xml;                                                                                  
     geom_type text;                                                                               
     geom_srid integer;                                                                            
 begin                                                                                             
     geom_type := st_geometrytype(p_geom);                                                         
     geom_srid := st_srid(p_geom);                                                                 
     if geom_type = 'ST_MultiPolygon' and geom_srid = 2056 then                                    
       select xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.MultiPolygon",                         
             xmlelement(name "Polygones", xmlagg(geomxml))) into result                            
                         from (select alma_export.interlis_be_geometry_polygon_boundaries_internal(
                               st_geometryn(p_geom, generate_series(1,st_numgeometries(p_geom)))   
                           )as geomxml                                                             
             ) foo;                                                                                
     elsif geom_type != 'ST_MultiPolygon' then                                                     
         raise 'unsupported geometry type: %', geom_type;                                          
     else                                                                                          
         raise 'unsupported geometry srid: %', geom_srid;                                          
     end if;                                                                                       
     return result;                                                                                
 end 
$$;

comment on function alma_export.interlis_be_geometry_multipolygon is '';



drop function if exists alma_export.interlis_be_geometry(p_geom public.geometry);

create function alma_export.interlis_be_geometry(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare                                                                 
     result xml;                                                         
     geom_type text;                                                     
 begin                                                                                                                                    
                                                                         
     geom_type := st_geometrytype(p_geom);                               
     if geom_type = 'ST_Point' then                                      
         result := alma_export.interlis_geometry_point(p_geom);                  
     elsif geom_type = 'ST_Line' or geom_type = 'ST_LineString' then     
         result := alma_export.interlis_geometry_line(p_geom);                   
     elsif geom_type = 'ST_Polygon' then                                 
         result := alma_export.interlis_geometry_polygon(p_geom);                
      elsif geom_type = 'ST_MultiPolygon' then                           
         result := alma_export.interlis_be_geometry_multipolygon(p_geom);
     else                                                                
         raise 'unsupported geometry type: %', geom_type;                
     end if;                                                             
     return result;                                                      
 end 
$$;

comment on function alma_export.interlis_be_geometry is '';



drop function if exists alma_export.interlis_be(p_vflz_ids integer[]);

create function alma_export.interlis_be(p_vflz_ids integer[]) returns xml
    language sql
    as $_$

with bidprops as (
    select 
        'kbsMGDM' || msgstr as bid
    from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'
),

wmsprops as (
    (select msgstr as url_geoportal from alma.translations s where s.msgid = 'interlis_settings.url_standort' and locale = 'de') 
),


-- all sites of the list of vflz_ids
standorte as (
    select 'stao'||v.vflz_id::text as stao_tid,
        v.vflz_id,
        v.vfl_id,
        v.vflz_combined_id_kt,
        bezeichnung,
        vflgeo.wkb_geometry,
        round(st_area(vflgeo.wkb_geometry)) as flaeche,
        vflnr.c_org_kuerzel,
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid,
        bem_standort.bem as standort_bemerkungen,
        zentroid as wkb_point,
        h_gem.gemeinde as gemeinde,
        st_x(zentroid) as x_koordinate,
        st_y(zentroid) as y_koordinate,
        staotyp_mapping.code_long as staotyp,
        v.c_vflz_deponietyp::text as deponietyp,
        case when v.nachsorge = true then true::text else false::text end as nachsorge,
        v.dat_rechtskraft::date as date_ersteintrag,
        (   -- legally binding date
            select vflz_is_published_v.dat_latest_published::text as dat_latest_published
               from alma.vflz_is_published_v
               where (vflz_is_published_v.vflz_id in ( select vflz_any_in_vfl.vflz_id
                                    from alma.vflz vflz_any_in_vfl
                                    where vflz_any_in_vfl.vfl_id = v.vfl_id)
                    ) and vflz_is_published_v.is_latest_published
        )::date as date_letzteanpassung,
        statusaltlv_mapping.code_long as statusaltlv,
        alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand) as untersuchungsstand,
        alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'de') as statusbezeichnung,
        alma.msgid_code(10104, bere.c_bere_res_abwbewe) as rechtlicher_bezug,
        alma.msgid_code(10105, bere.c_bere_res_abwbewe) as handlungsbedarf,
        COALESCE((select max(started_at) from alma.wf_node 
            where entity_id in (select vflz_id from alma.vflz where vflz.vfl_id = v.vfl_id)
            and title like '%Benachrichtigung Katastereintrag%'
            group by entity_id, wf_config_id
        ),
        (select max(started_at) from alma.wf_node 
            where entity_id in (select vflz_id from alma.vflz where vflz.vfl_id = v.vfl_id)
            and wf_config_id = (select wf_config_id from alma.wf_config where key = '33864b0f-354f-42df-ac39-34463c273a48')
            group by entity_id, wf_config_id
        )
        ) as kbs_info_gre,
        'Amt für Wasser und Abfall (AWA) Tel: 031 633 38 11' as info,
        case when v.in_betrieb = true then true::text else false::text end as in_betrieb,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') is not null then
          (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') 
          || (regexp_replace(vfilename.filename::text, ' '::text, '%20'::text, 'g'::text))
          else null end as url_kbs_datasheet,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_alma' and locale = 'de')||'/vflz/'||v.vflz_id as url_alma
    from alma.vflz v
    join alma.vflz_current_v vcv using (vflz_id)
    left join alma_export.interlis_cod_mapping_v staotyp_mapping on staotyp_mapping.c_cli_id = v.h_vflz_vftyp
                and staotyp_mapping.code = v.c_vflz_vftyp
    left join alma.bere on bere.vflz_id = v.vflz_id 
    join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv
    
	left join alma.vflgeo on vflgeo.vflz_id = v.vflz_id
    left join alma.bemgrp bemg_standort on bemg_standort.public and bemg_standort.bemgrp='standort'
    left join alma.bem bem_standort on bem_standort.bemgrp_id = bemg_standort.bemgrp_id and
                bem_standort.key_value = v.vflz_id and bem_standort.public
    left join alma_export.interlis_cod_mapping_v statusaltlv_mapping on statusaltlv_mapping.c_cli_id = bere.h_bere_res_abwbewe
                and statusaltlv_mapping.code = bere.c_bere_res_abwbewe

    left join alma_export.vflz_filename_v vfilename on vfilename.vflz_id = v.vflz_id
    left join alma.h_gem using (h_gem_id)

    where v.vfl_id in (
        select vfl_id from alma.vflz where vflz_id = any($1)
    )
    and vflnr.c_org_kuerzel in (
        select distinct trim(unnest(string_to_array(msgstr, ',')))
        from alma.translations
        where msgid in ('interlis_settings.aemter_vollzug', 'interlis_settings.amt_kuerzel')
            and locale = 'de'
            and msgstr is not null
            and msgstr != ''
    )
    order by v.vflz_id
),

unfall as (
    select veen.vflz_id,
        veen.veen_datum as unfalldatum
    from alma.veen
    where veen.c_veen_natuerlich = 'unfall'
),

unfall_xml as (
select unfall.vflz_id,
        xmlelement(name "KbS_V1_5_BE_V1.Unfall",
            xmlelement(name "Unfalldatum", unfall.unfalldatum::date)
    ) as unfall_x
from unfall
),

geoportallinks as (
    select
        standorte.vflz_id,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'standortnummer' then
          wmsprops.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text))
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops.url_geoportal || '&y=' || st_x(standorte.wkb_point)::text || '&x=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops.url_geoportal || '&map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops.url_geoportal || '&c=' || st_y(standorte.wkb_point)::text || ',' || st_x(standorte.wkb_point)::text 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops.url_geoportal 
        end as permalink_geoportal
    from standorte, wmsprops
),


-- parcels for all returned sites
parzellen as (
  select 
    grun.h_nb_id as nbident, 
    grun.h_gem_id as h_gem_id,
    grun.egrid as egrid,
    v.vflz_id as vflz_id, 
    grun.gb_nummer as parzelle 
  from standorte v
  left join alma.bet on v.vflz_id = bet.vflz_id
  left join alma.bet_art using (bet_id)
  left join alma.grun using (grun_id)
  where not (grun.h_nb_id is null and grun.h_gem_id is null and grun.egrid is null and grun.gb_nummer is null)
  group by grun.h_nb_id, grun.h_gem_id, grun.egrid, v.vflz_id, grun.gb_nummer
),

-- parcels in xml form
parzellen_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5_BE_V1.Parzellenidentifikation",
        xmlelement(name "NBIdent", parzellen.nbident),
        xmlelement(name "Parzellennummer", parzellen.parzelle)
    ) as x_v15
from parzellen
where parzellen.nbident is not null and parzellen.parzelle is not null
order by parzellen.parzelle
),

-- egrid in xml form
egrid_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5_BE_V1.EGRID_",
            xmlelement(name "value", parzellen.egrid)
        )
    as x_v15
from parzellen
where parzellen.egrid is not null
order by parzellen.parzelle
),

-- sites in xml form

standorte_xml_v15 as (
    select xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.Belasteter_Standort",
          xmlattributes(standorte.stao_tid as "TID"),
          xmlelement(name "Katasternummer", standorte.vflz_combined_id_kt),
          xmlelement(name "Standortbezeichnung", standorte.bezeichnung),
          case when geoportallinks.permalink_geoportal is not null then
            xmlelement(name "URL_Standort", 
                xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.MultilingualUri",
                    xmlelement(name "LocalisedText",
                        xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'de'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=de'))
                        ), 
                        xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",   
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                     then xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=rm'))
                                    else xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=fr')) end
                        ),
                        xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'it'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=it'))
                        )
                    )
                )
            )
          else 
            xmlelement(name "URL_Standort", geoportallinks.permalink_geoportal)
          end,
          case when standorte.wkb_geometry is not null then
              case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                  xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_be_geometry(st_transform((standorte.wkb_geometry), 2056)))
              else
                  xmlelement(name "Geo_Lage_Polygon", alma_export.interlis_be_geometry(st_transform((standorte.wkb_geometry), 2056)))
              end
          else
              xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_be_geometry(st_transform((standorte.wkb_geometry), 2056)))
          end,
         case
               when exists(select vflz_id from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x_v15) from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
          end,
          case
               when exists(select vflz_id from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "EGRID", 
                        (select xmlagg(x_v15) from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id)
                    )
                else
                    xmlcomment('EGRID not available')
          end, 
          xmlelement(name "Hauptgemeinde", standorte.gemeinde),
          xmlelement(name "KOORD_X", standorte.x_koordinate),
          xmlelement(name "KOORD_Y", standorte.y_koordinate),
          xmlelement(name "Standorttyp", standorte.staotyp),
          xmlelement(name "InBetrieb", standorte.in_betrieb),
          case
               when standorte.deponietyp is not null then
                  xmlelement(name "Deponietyp", xmlelement(name "KbS_V1_5_BE_V1.Deponietyp_",
                        xmlelement(name "value", standorte.deponietyp)
                        )
                  )
                else
                    xmlcomment('Deponietyp not available')
          end,
          case
                when standorte.nachsorge is not null then
                    xmlelement(name "Nachsorge", standorte.nachsorge)
                else
                    xmlcomment('Nachsorge not available')
          end,
          xmlelement(name "Untersuchungsstand",
            alma_export.interlis_kbs_localisedtext_t(standorte.untersuchungsstand, array['de', 'fr', 'it'])
          ),
          xmlelement(name "Statusbezeichnung", standorte.statusbezeichnung),
          xmlelement(name "RechtlicherBezug",
            alma_export.interlis_kbs_localisedtext_t(standorte.rechtlicher_bezug, array['de', 'fr', 'it'])
          ),
          xmlelement(name "Handlungsbedarf",
            alma_export.interlis_kbs_localisedtext_t(standorte.handlungsbedarf, array['de', 'fr', 'it'])
          ),
          xmlelement(name "UngefaehreFlaeche", standorte.flaeche),
          xmlelement(name "Unfaelle", (select xmlagg(unfall_x) from unfall_xml where unfall_xml.vflz_id = standorte.vflz_id)),
          xmlelement(name "Kbs_Info_GRE", standorte.kbs_info_gre),
          xmlelement(name "Info", standorte.info),
          xmlelement(name "StatusAltlV", standorte.statusaltlv),
          xmlelement(name "Ersteintrag", standorte.date_ersteintrag::date),
          xmlelement(name "LetzteAnpassung", standorte.date_letzteanpassung::date),
          xmlelement(name "URL_KbS_Auszug",                                                                                                                                                               
             xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                          
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'de'),                                                                                                                                                
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     ),                                                                                                                                                                                    
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                        
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                   
                     xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                                  
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     )                                                                                                                                                                                     
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
           ),   
          xmlcomment('Bemerkung not available'),
          xmlelement(name "ZustaendigkeitKataster",
            xmlattributes(
                standorte.zb_tid as "REF"
            )
          ),
          xmlelement(name "URL_alma", standorte.url_alma)
      ) as x
    from standorte
    join geoportallinks on geoportallinks.vflz_id = standorte.vflz_id
    order by standorte.stao_tid
),


-- org
zustaendige_behoerde as (
select
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid, /* this id also gets build in the standorte with-clause*/
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'de') as behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'fr') as behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'it') as behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'de') as url_behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_rm,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'it') as url_behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_uid' and locale = 'de') as uid,
        (select'interlis_settings.katastername') as katastername,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_kbs_auszug' and locale = 'de') as url_webgis
),

-- org as xml
zustaendige_behoerde_xml as (
    select 
    xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.ZustaendigkeitKataster",
      xmlattributes(zustaendige_behoerde.zb_tid as "TID"),
      xmlelement(name "Zustaendige_Behoerde", 
        xmlelement(name "LocalisationCH_V1.MultilingualText",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                          
      ),

      xmlelement(name "URL_Behoerde",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         ), 

      xmlelement(name "UID", zustaendige_behoerde.uid),
      xmlelement(name "Katastername",
            alma_export.interlis_kbs_localisedtext_t(zustaendige_behoerde.katastername, 
            array['de',
                    case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                        then 'rm' 
                    else 'fr' end,
                    'it'
                ])
      ),

      xmlelement(name "URL_Kataster",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=de'))                                                                                                     
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                  then xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=rm'))                                                                                       
                                 else xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=fr')) end                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=it'))                                                                                                     
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         )   


    ) as x_v15
    from zustaendige_behoerde
)

-- assembling of the finished xml document according to the interlis schema
select xmlelement(name "TRANSFER", xmlattributes('http://www.interlis.ch/INTERLIS2.3' as xmlns),
    xmlelement(name "HEADERSECTION",
        xmlattributes('alma' as "SENDER", '2.3' as "VERSION"),
          xmlelement(name "MODELS", -- need to add all used models by hand
              xmlelement(name "MODEL",xmlattributes('CoordSys' as "NAME",'2015-11-24' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('InternationalCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Localisation_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('LocalisationCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Dictionaries_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('DictionariesCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Units' as "NAME",'2012-02-20' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('GeometryCHLV95_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('KbS_V1_5_BE_V1' as "NAME",'2026-04-21' as "VERSION",'https://test.be.ch' as "URI"))
          )
    ),
   
    xmlelement(name "DATASECTION",
        xmlelement(name "KbS_V1_5_BE_V1.Belastete_Standorte",-- there is no attribute that could server as a bucket-identifier. so we generate an artiffical one.
            xmlattributes((select bid from bidprops) as "BID"),
                ( select xmlagg(x_v15) from zustaendige_behoerde_xml),
                ( select xmlagg(x) from standorte_xml_v15)
        )
    )

);

$_$;

comment on function alma_export.interlis_be is 'Generieren der INTERLIS XTF Datei für die interne BE Version.
    Der Export beinhaltet alle Standorte.';





drop function if exists alma_export.interlis_vd(p_vflz_ids integer[]);

create function alma_export.interlis_vd(p_vflz_ids integer[]) returns xml
    language sql
    as $_$

with bidprops as (
    select 
        'kbsMGDM' || msgstr as bid
    from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'
),

wmsprops as (
    (select msgstr as url_geoportal from alma.translations s where s.msgid = 'interlis_settings.url_standort' and locale = 'de') 
),


-- all sites of the list of vflz_ids
standorte as (
    select 'stao'||v.vflz_id::text as stao_tid,
        v.vflz_id,
        v.vfl_id,
        v.vflz_combined_id_kt,
        bezeichnung,
        vflgeo.wkb_geometry,
        vflnr.c_org_kuerzel,
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid,
        bem_standort.bem as standort_bemerkungen,
        zentroid as wkb_point,
        staotyp_mapping.code_long as staotyp,
        v.c_vflz_deponietyp::text as deponietyp,
        case when v.nachsorge = true then true::text else false::text end as nachsorge,
        v.dat_rechtskraft::date as date_ersteintrag,
        (   -- legally binding date
            select vflz_is_published_v.dat_latest_published::text as dat_latest_published
               from alma.vflz_is_published_v
               where (vflz_is_published_v.vflz_id in ( select vflz_any_in_vfl.vflz_id
                                    from alma.vflz vflz_any_in_vfl
                                    where vflz_any_in_vfl.vfl_id = v.vfl_id)
                    ) and vflz_is_published_v.is_latest_published
        )::date as date_letzteanpassung,
        statusaltlv_mapping.code_long as statusaltlv,
        alma.translate_code(msgid_code(h_bere_prio_untersuch, c_bere_prio_untersuch), 'fr') as prio_untersuchungsbedarf,
        case when v.in_betrieb = true then true::text else false::text end as in_betrieb,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') is not null then
          (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') 
          || (regexp_replace(vfilename.filename::text, ' '::text, '%20'::text, 'g'::text))
          else null end as url_kbs_datasheet
    from alma.vflz v
    join alma.vflz_is_published_v vip on v.vflz_id = vip.vflz_id and vip.is_latest_published /* only published versions */
    join alma_export.interlis_cod_mapping_v staotyp_mapping on staotyp_mapping.c_cli_id = v.h_vflz_vftyp
                and staotyp_mapping.code = v.c_vflz_vftyp
    join alma.bere on bere.vflz_id = v.vflz_id 
    join alma.cod_kbsinfo info on info.h_bere_res_abwbewe = bere.h_bere_res_abwbewe and info.c_bere_res_abwbewe=bere.c_bere_res_abwbewe and info.belastet
    join alma_export.interlis_cod_mapping_v statusaltlv_mapping on statusaltlv_mapping.c_cli_id = bere.h_bere_res_abwbewe
                and statusaltlv_mapping.code = bere.c_bere_res_abwbewe
    join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv

    left  join alma.vflgeo on vflgeo.vflz_id = v.vflz_id
    left join alma.bemgrp bemg_standort on bemg_standort.public and bemg_standort.bemgrp='standort'
    left join alma.bem bem_standort on bem_standort.bemgrp_id = bemg_standort.bemgrp_id and
                bem_standort.key_value = v.vflz_id and bem_standort.public

    left join alma_export.vflz_filename_v vfilename on vfilename.vflz_id = v.vflz_id

    where v.vfl_id in (
        select vfl_id from alma.vflz where vflz_id = any($1)
    )
    and vflnr.c_org_kuerzel in (
        select distinct trim(unnest(string_to_array(msgstr, ',')))
        from alma.translations
        where msgid in ('interlis_settings.aemter_vollzug', 'interlis_settings.amt_kuerzel')
            and locale = 'de'
            and msgstr is not null
            and msgstr != ''
    )
    order by v.vflz_id
),

inta as (
    select inta.vflz_id,
        inta.inta_id,
        concat(vflz_id, inta_id) as stao_tid,
        inta.inta_vol_kompartiment as volumen,
        inta.inta_ablag_von::date as betrieb_start,
        inta.inta_ablag_bis::date as betrieb_ende
    from alma.inta
),

intb_betriebe as (
    select
        intb.vflz_id,
        intb.intb_id as intb_id,
        concat(vflz_id, intb_id) as stao_tid,
        concat('02',intb_id) as intb_tid,
        intb.intb_firma_name as name,
        intb.intb_vonbetrieb::date as betrieb_start,
        intb.intb_bisbetrieb::date as betrieb_ende,
        split_part(
            alma.translate_code(alma.msgid_code(h_intb_bran, c_intb_bran), 'fr'),
            ' - ',
            1
        ) as code_branche,
        split_part(
            alma.translate_code(alma.msgid_code(h_intb_bran, c_intb_bran), 'fr'),
            ' - ',
            2
        ) as text_branche
    from alma.intb
    where intb_typ = '02'
),


intb_schiessanlagen as (
    select
        intb.vflz_id,
        intb.intb_id,
        concat(vflz_id, intb_id) as stao_tid,
        concat('04',intb_id) as intb_tid,
        intb.intb_firma_name as name,
        intb.intb_vonbetrieb::date as betrieb_start,
        intb.intb_bisbetrieb::date as betrieb_ende,
        split_part(
            alma.translate_code(alma.msgid_code(h_intb_bran, c_intb_bran), 'fr'),
            ' - ',
            1
        ) as code_branche,
        split_part(
            alma.translate_code(alma.msgid_code(h_intb_bran, c_intb_bran), 'fr'),
            ' - ',
            2
        ) as text_branche
    from alma.intb
    where intb_typ = '04'
),

intu as (
    select intu.vflz_id,
        intu.intu_id,
        concat(vflz_id, intu_id) as stao_tid,
        intu.intu_name as name,
        intu.intu_unfallvon::date as unfall_start
    from alma.intu
),

geoportallinks as (
    select
        standorte.vflz_id,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'standortnummer' then
          wmsprops.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text))
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops.url_geoportal || '&y=' || st_x(standorte.wkb_point)::text || '&x=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops.url_geoportal || '&map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops.url_geoportal || '&c=' || st_y(standorte.wkb_point)::text || ',' || st_x(standorte.wkb_point)::text 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops.url_geoportal 
        end as permalink_geoportal
    from standorte, wmsprops
),


-- parcels for all returned sites
parzellen as (
  select 
    grun.h_nb_id as nbident, 
    grun.h_gem_id as h_gem_id,
    grun.egrid as egrid,
    v.vflz_id as vflz_id, 
    grun.gb_nummer as parzelle 
  from standorte v
  left join alma.bet on v.vflz_id = bet.vflz_id
  left join alma.bet_art using (bet_id)
  left join alma.grun using (grun_id)
  where not (grun.h_nb_id is null and grun.h_gem_id is null and grun.egrid is null and grun.gb_nummer is null)
  group by grun.h_nb_id, grun.h_gem_id, grun.egrid, v.vflz_id, grun.gb_nummer
),

-- parcels in xml form
parzellen_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5.Parzellenidentifikation",
        xmlelement(name "NBIdent", parzellen.nbident),
        xmlelement(name "Parzellennummer", parzellen.parzelle)
    ) as x
from parzellen
where parzellen.nbident is not null and parzellen.parzelle is not null
order by parzellen.parzelle
),

-- egrid in xml form
egrid_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5.EGRID_",
            xmlelement(name "value", parzellen.egrid)
        )
    as x
from parzellen
where parzellen.egrid is not null
order by parzellen.parzelle
),


untersuchungsmassnahmen_pre_vfl as (
select massn.*
from (
      select tm.code_long, tm.ili_code, tm.ili_c_cli_id, v.vfl_id from alma_export.interlis_task_mapping_v tm join alma.vflz v on v.c_vflz_unterstand = tm.a4w_code
) massn
join standorte s on massn.vfl_id = s.vfl_id
),

untersuchungsmassnahmen_vfl as (
select
    s.vfl_id, up.code_long, up.ili_code, up.ili_c_cli_id
from untersuchungsmassnahmen_pre_vfl up
join standorte s on up.vfl_id = s.vfl_id
union
-- provide untmassn1 if no other untersuchungsmassnahme is available
select s.vfl_id, 'UntMassn1' as code_long, 'UM1' as ili_code, 20023 as ili_c_cli_id
from standorte s
    where s.vfl_id not in (select vfl_id from untersuchungsmassnahmen_pre_vfl)
    ),

untersuchungsmassnahmen_xml_vfl as (
select um.vfl_id,
        xmlelement(name "KbS_V1_5.UntersMassn_",
        xmlelement(name "value", um.code_long)
    ) as x
from untersuchungsmassnahmen_vfl um
),


untersuchungsmassnahmen_pre_vflz as (
select massn.*
from (
      select tm.code_long, tm.ili_code, tm.ili_c_cli_id, v.vfl_id, v.vflz_id from alma_export.interlis_task_mapping_v tm join alma.vflz v on v.c_vflz_unterstand = tm.a4w_code
) massn
join standorte s on massn.vflz_id = s.vflz_id
),

untersuchungsmassnahmen_vflz as (
select
    s.vflz_id, s.vfl_id, up.code_long, up.ili_code, up.ili_c_cli_id
from untersuchungsmassnahmen_pre_vflz up
join standorte s on up.vflz_id = s.vflz_id
union
-- provide untmassn1 if no other untersuchungsmassnahme is available
select s.vflz_id, s.vfl_id, 'UntMassn1' as code_long, 'UM1' as ili_code, 20023 as ili_c_cli_id
from standorte s
    where s.vflz_id not in (select vflz_id from untersuchungsmassnahmen_pre_vflz)
    ),



untersuchungsmassnahmen_xml_vflz as (
select um.vflz_id,
        xmlelement(name "KbS_V1_5.UntersMassn_",
        xmlelement(name "value", um.code_long)
    ) as x
from untersuchungsmassnahmen_vflz um
),


-- sites in xml form

DechargeRemblai_xml as (
    select xmlelement(name "SitesPollues.SitesPollues.DechargeRemblai",
          xmlattributes(inta.stao_tid as "TID"),
          xmlelement(name "Katasternummer", standorte.vflz_combined_id_kt),
          case when geoportallinks.permalink_geoportal is not null then
            xmlelement(name "URL_Standort", 
                xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",
                    xmlelement(name "LocalisedText",
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'de'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=de'))
                        ), 
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",   
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                     then xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=rm'))
                                    else xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=fr')) end
                        ),
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'it'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=it'))
                        )
                    )
                )
            )
          else 
            xmlelement(name "URL_Standort", geoportallinks.permalink_geoportal)
          end,
          case when standorte.wkb_geometry is not null then
              case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                  xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              else
                  xmlelement(name "Geo_Lage_Polygon", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              end
          else
              xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
          end,
         case
               when exists(select vflz_id from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x) from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
          end,
          case
               when exists(select vflz_id from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "EGRID", 
                        (select xmlagg(x) from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id)
                    )
                else
                    xmlcomment('EGRID not available')
          end, 
          xmlelement(name "Standorttyp", standorte.staotyp),
          xmlelement(name "InBetrieb", standorte.in_betrieb),
          case
               when standorte.deponietyp is not null then
                  xmlelement(name "Deponietyp", xmlelement(name "KbS_V1_5.Deponietyp_",
                        xmlelement(name "value", standorte.deponietyp)
                        )
                  )
                else
                    xmlcomment('Deponietyp not available')
          end,
          case
                when standorte.nachsorge is not null then
                    xmlelement(name "Nachsorge", standorte.nachsorge)
                else
                    xmlcomment('Nachsorge not available')
          end,
          case 
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'alle nach standortversionen' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vfl where untersuchungsmassnahmen_xml_vfl.vfl_id = standorte.vfl_id))
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'aktuellste' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
                else 
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
          end,
          xmlelement(name "StatusAltlV", standorte.statusaltlv),
          xmlelement(name "Ersteintrag", standorte.date_ersteintrag::date),
          xmlelement(name "LetzteAnpassung", standorte.date_letzteanpassung::date),
          xmlelement(name "URL_KbS_Auszug",                                                                                                                                                               
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                          
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'de'),                                                                                                                                                
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     ),                                                                                                                                                                                    
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                        
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                   
                     xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                                  
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     )                                                                                                                                                                                     
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
           ),   
          xmlcomment('Bemerkung not available'),
          xmlelement(name "designation", standorte.bezeichnung),
          xmlelement(name "volume", inta.volumen),
          xmlelement(name "debutActivite", inta.betrieb_start::date),
          xmlelement(name "finActivite", inta.betrieb_ende::date),
          xmlelement(name "anneeInvestigation", standorte.prio_untersuchungsbedarf),
          xmlelement(name "ZustaendigkeitKataster",
            xmlattributes(
                standorte.zb_tid as "REF"
            )
          )
      ) as x
    from inta
    join standorte on inta.vflz_id = standorte.vflz_id
    join geoportallinks on geoportallinks.vflz_id = standorte.vflz_id
    where standorte.staotyp = 'StaoTyp1'
    order by standorte.stao_tid
),

AireExploitation_xml as (
    select xmlelement(name "SitesPollues.SitesPollues.AireExploitation",
          xmlattributes(intb_betriebe.stao_tid as "TID"),
          xmlelement(name "Katasternummer", standorte.vflz_combined_id_kt),
          case when geoportallinks.permalink_geoportal is not null then
            xmlelement(name "URL_Standort", 
                xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",
                    xmlelement(name "LocalisedText",
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'de'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=de'))
                        ), 
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",   
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                     then xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=rm'))
                                    else xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=fr')) end
                        ),
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'it'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=it'))
                        )
                    )
                )
            )
          else 
            xmlelement(name "URL_Standort", geoportallinks.permalink_geoportal)
          end,
          case when standorte.wkb_geometry is not null then
              case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                  xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              else
                  xmlelement(name "Geo_Lage_Polygon", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              end
          else
              xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
          end,
         case
               when exists(select vflz_id from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x) from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
          end,
          case
               when exists(select vflz_id from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "EGRID", 
                        (select xmlagg(x) from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id)
                    )
                else
                    xmlcomment('EGRID not available')
          end, 
          xmlelement(name "Standorttyp", standorte.staotyp),
          xmlelement(name "InBetrieb", standorte.in_betrieb),
          case
               when standorte.deponietyp is not null then
                  xmlelement(name "Deponietyp", xmlelement(name "KbS_V1_5.Deponietyp_",
                        xmlelement(name "value", standorte.deponietyp)
                        )
                  )
                else
                    xmlcomment('Deponietyp not available')
          end,
          case
                when standorte.nachsorge is not null then
                    xmlelement(name "Nachsorge", standorte.nachsorge)
                else
                    xmlcomment('Nachsorge not available')
          end,
          case 
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'alle nach standortversionen' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vfl where untersuchungsmassnahmen_xml_vfl.vfl_id = standorte.vfl_id))
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'aktuellste' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
                else 
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
          end,
          xmlelement(name "StatusAltlV", standorte.statusaltlv),
          xmlelement(name "Ersteintrag", standorte.date_ersteintrag::date),
          xmlelement(name "LetzteAnpassung", standorte.date_letzteanpassung::date),
          xmlelement(name "URL_KbS_Auszug",                                                                                                                                                               
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                          
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'de'),                                                                                                                                                
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     ),                                                                                                                                                                                    
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                        
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                   
                     xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                                  
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     )                                                                                                                                                                                     
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
           ),   
          xmlcomment('Bemerkung not available'),
          xmlelement(name "designation", intb_betriebe.name),
          xmlelement(name "anneeInvestigation", standorte.prio_untersuchungsbedarf),
          xmlelement(name "ZustaendigkeitKataster",
            xmlattributes(
                standorte.zb_tid as "REF"
            )
          )
      ) as x
    from intb_betriebe
    join standorte on intb_betriebe.vflz_id = standorte.vflz_id
    join geoportallinks on geoportallinks.vflz_id = standorte.vflz_id
    where standorte.staotyp = 'StaoTyp2'
    order by standorte.stao_tid
),

Accident_xml as (
    select xmlelement(name "SitesPollues.SitesPollues.Accident",
          xmlattributes(intu.stao_tid as "TID"),
          xmlelement(name "Katasternummer", standorte.vflz_combined_id_kt),
          case when geoportallinks.permalink_geoportal is not null then
            xmlelement(name "URL_Standort", 
                xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",
                    xmlelement(name "LocalisedText",
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'de'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=de'))
                        ), 
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",   
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                     then xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=rm'))
                                    else xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=fr')) end
                        ),
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'it'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=it'))
                        )
                    )
                )
            )
          else 
            xmlelement(name "URL_Standort", geoportallinks.permalink_geoportal)
          end,
          case when standorte.wkb_geometry is not null then
              case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                  xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              else
                  xmlelement(name "Geo_Lage_Polygon", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              end
          else
              xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
          end,
         case
               when exists(select vflz_id from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x) from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
          end,
          case
               when exists(select vflz_id from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "EGRID", 
                        (select xmlagg(x) from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id)
                    )
                else
                    xmlcomment('EGRID not available')
          end, 
          xmlelement(name "Standorttyp", standorte.staotyp),
          xmlelement(name "InBetrieb", standorte.in_betrieb),
          case
               when standorte.deponietyp is not null then
                  xmlelement(name "Deponietyp", xmlelement(name "KbS_V1_5.Deponietyp_",
                        xmlelement(name "value", standorte.deponietyp)
                        )
                  )
                else
                    xmlcomment('Deponietyp not available')
          end,
          case
                when standorte.nachsorge is not null then
                    xmlelement(name "Nachsorge", standorte.nachsorge)
                else
                    xmlcomment('Nachsorge not available')
          end,
          case 
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'alle nach standortversionen' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vfl where untersuchungsmassnahmen_xml_vfl.vfl_id = standorte.vfl_id))
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'aktuellste' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
                else 
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
          end,
          xmlelement(name "StatusAltlV", standorte.statusaltlv),
          xmlelement(name "Ersteintrag", standorte.date_ersteintrag::date),
          xmlelement(name "LetzteAnpassung", standorte.date_letzteanpassung::date),
          xmlelement(name "URL_KbS_Auszug",                                                                                                                                                               
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                          
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'de'),                                                                                                                                                
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     ),                                                                                                                                                                                    
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                        
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                   
                     xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                                  
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     )                                                                                                                                                                                     
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
           ),   
          xmlcomment('Bemerkung not available'),
          xmlelement(name "designation", intu.name),
          xmlelement(name "date", intu.unfall_start::date),
          xmlelement(name "anneeInvestigation", standorte.prio_untersuchungsbedarf),
          xmlelement(name "ZustaendigkeitKataster",
            xmlattributes(
                standorte.zb_tid as "REF"
            )
          )
      ) as x
    from intu
    join standorte on intu.vflz_id = standorte.vflz_id
    join geoportallinks on geoportallinks.vflz_id = standorte.vflz_id
    where standorte.staotyp = 'StaoTyp3'
    order by standorte.stao_tid
),

InstallationTir_xml as (
    select xmlelement(name "SitesPollues.SitesPollues.InstallationTir",
          xmlattributes(intb_schiessanlagen.stao_tid as "TID"),
          xmlelement(name "Katasternummer", standorte.vflz_combined_id_kt),
          case when geoportallinks.permalink_geoportal is not null then
            xmlelement(name "URL_Standort", 
                xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",
                    xmlelement(name "LocalisedText",
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'de'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=de'))
                        ), 
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",   
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                     then xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=rm'))
                                    else xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=fr')) end
                        ),
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'it'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=it'))
                        )
                    )
                )
            )
          else 
            xmlelement(name "URL_Standort", geoportallinks.permalink_geoportal)
          end,
          case when standorte.wkb_geometry is not null then
              case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                  xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              else
                  xmlelement(name "Geo_Lage_Polygon", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              end
          else
              xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
          end,
         case
               when exists(select vflz_id from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x) from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
          end,
          case
               when exists(select vflz_id from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "EGRID", 
                        (select xmlagg(x) from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id)
                    )
                else
                    xmlcomment('EGRID not available')
          end, 
          xmlelement(name "Standorttyp", standorte.staotyp),
          xmlelement(name "InBetrieb", standorte.in_betrieb),
          case
               when standorte.deponietyp is not null then
                  xmlelement(name "Deponietyp", xmlelement(name "KbS_V1_5.Deponietyp_",
                        xmlelement(name "value", standorte.deponietyp)
                        )
                  )
                else
                    xmlcomment('Deponietyp not available')
          end,
          case
                when standorte.nachsorge is not null then
                    xmlelement(name "Nachsorge", standorte.nachsorge)
                else
                    xmlcomment('Nachsorge not available')
          end,
          case 
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'alle nach standortversionen' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vfl where untersuchungsmassnahmen_xml_vfl.vfl_id = standorte.vfl_id))
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'aktuellste' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
                else 
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
          end,
          xmlelement(name "StatusAltlV", standorte.statusaltlv),
          xmlelement(name "Ersteintrag", standorte.date_ersteintrag::date),
          xmlelement(name "LetzteAnpassung", standorte.date_letzteanpassung::date),
          xmlelement(name "URL_KbS_Auszug",                                                                                                                                                               
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                          
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'de'),                                                                                                                                                
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     ),                                                                                                                                                                                    
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                        
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                   
                     xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                                  
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     )                                                                                                                                                                                     
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
           ),   
          xmlcomment('Bemerkung not available'),
          xmlelement(name "designation", intb_schiessanlagen.name),
          xmlelement(name "anneeInvestigation", standorte.prio_untersuchungsbedarf),
          xmlelement(name "ZustaendigkeitKataster",
            xmlattributes(
                standorte.zb_tid as "REF"
            )
          )
      ) as x
    from intb_schiessanlagen
    join standorte on intb_schiessanlagen.vflz_id = standorte.vflz_id
    join geoportallinks on geoportallinks.vflz_id = standorte.vflz_id
    where standorte.staotyp = 'StaoTyp4'
    order by standorte.stao_tid
),



ActiviteAireExploitation_xml as (
    select xmlelement(name "SitesPollues.SitesPollues.ActiviteAireExploitation",
          xmlattributes(intb_betriebe.intb_tid as "TID"),
          xmlelement(name "debutActivite", intb_betriebe.betrieb_start::date),
          xmlelement(name "finActivite", intb_betriebe.betrieb_ende::date),
          xmlelement(name "type", 
            xmlelement(name "SitesPollues.SitesPollues.TypeActiviteEconomique",
                xmlelement(name "code", intb_betriebe.code_branche),
                xmlelement(name "libelle", intb_betriebe.text_branche)
            )
          ),
          xmlelement(name "aireExploitation", xmlattributes(intb_betriebe.stao_tid as "REF")) 
      ) as x
    from intb_betriebe
    join standorte on intb_betriebe.vflz_id = standorte.vflz_id
    order by intb_betriebe.intb_id
),


ActiviteInstallationTir_xml as (
    select xmlelement(name "SitesPollues.SitesPollues.ActiviteInstallationTir",
          xmlattributes(intb_schiessanlagen.intb_tid as "TID"),
          xmlelement(name "debutActivite", intb_schiessanlagen.betrieb_start::date),
          xmlelement(name "finActivite", intb_schiessanlagen.betrieb_ende::date),
          xmlelement(name "type", 
            xmlelement(name "SitesPollues.SitesPollues.TypeActiviteEconomique",
                xmlelement(name "code", intb_schiessanlagen.code_branche),
                xmlelement(name "libelle", intb_schiessanlagen.text_branche)
            )
          ),
          xmlelement(name "installationTir", xmlattributes(intb_schiessanlagen.stao_tid as "REF"))  
      ) as x
    from intb_schiessanlagen
    join standorte on intb_schiessanlagen.vflz_id = standorte.vflz_id
    order by intb_schiessanlagen.intb_id
),

-- org
zustaendige_behoerde as (
select
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid, /* this id also gets build in the standorte with-clause*/
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'de') as behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'fr') as behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'it') as behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'de') as url_behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_rm,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'it') as url_behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_uid' and locale = 'de') as uid,
        (select'interlis_settings.katastername') as katastername,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_kbs_auszug' and locale = 'de') as url_webgis
),

-- org as xml
zustaendige_behoerde_xml as (
    select 
    xmlelement(name "KbS_V1_5.Belastete_Standorte.ZustaendigkeitKataster",
      xmlattributes(zustaendige_behoerde.zb_tid as "TID"),
      xmlelement(name "Zustaendige_Behoerde", 
        xmlelement(name "LocalisationCH_V1.MultilingualText",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                          
      ),

      xmlelement(name "URL_Behoerde",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         ), 

      xmlelement(name "UID", zustaendige_behoerde.uid),
      xmlelement(name "Katastername",
            alma_export.interlis_kbs_localisedtext_t(zustaendige_behoerde.katastername, 
            array['de',
                    case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                        then 'rm' 
                    else 'fr' end,
                    'it'
                ])
      ),

      xmlelement(name "URL_Kataster",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=de'))                                                                                                     
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                  then xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=rm'))                                                                                       
                                 else xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=fr')) end                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=it'))                                                                                                     
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         )   


    ) as x
    from zustaendige_behoerde
)

-- assembling of the finished xml document according to the interlis schema
select xmlelement(name "TRANSFER", xmlattributes('http://www.interlis.ch/INTERLIS2.3' as xmlns),
    xmlelement(name "HEADERSECTION",
        xmlattributes('alma' as "SENDER", '2.3' as "VERSION"),
          xmlelement(name "MODELS", -- need to add all used models by hand
              xmlelement(name "MODEL",xmlattributes('CoordSys' as "NAME",'2015-11-24' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('InternationalCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Localisation_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('LocalisationCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Dictionaries_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('DictionariesCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Units' as "NAME",'2012-02-20' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('GeometryCHLV95_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('KbS_V1_5' as "NAME",'2021-10-15' as "VERSION",'https://models.geo.admin.ch/BAFU' as "URI")),
              xmlelement(name "MODEL",xmlattributes('SitesPollues' as "NAME",'1.5.1' as "VERSION",'https://evd.vd.ch/geo' as "URI"))
          )
    ),
   
    xmlelement(name "DATASECTION",
        xmlelement(name "KbS_V1_5.Belastete_Standorte",-- there is no attribute that could server as a bucket-identifier. so we generate an artiffical one.
            xmlattributes((select bid from bidprops) as "BID"),
                ( select xmlagg(x) from zustaendige_behoerde_xml),
                ( select xmlagg(x) from DechargeRemblai_xml),
                ( select xmlagg(x) from AireExploitation_xml),
                ( select xmlagg(x) from Accident_xml),
                ( select xmlagg(x) from InstallationTir_xml),
                ( select xmlagg(x) from ActiviteAireExploitation_xml),
                ( select xmlagg(x) from ActiviteInstallationTir_xml)        )
    )

);

$_$;

comment on function alma_export.interlis_vd is 'Generieren der INTERLIS XTF Datei für das kantonale Modell von Vaud. 
    Der Export beinhaltet alle publizierten Standorte nach der Altlast Verordnung';



drop function if exists alma_export.interlis_lu(p_vflz_ids integer[]);

create function alma_export.interlis_lu(p_vflz_ids integer[]) returns xml
    language sql
    as $_$

with bidprops as (
    select 
        'kbsMGDM' || msgstr as bid
    from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'
),

wmsprops as (
    (select msgstr as url_geoportal from alma.translations s where s.msgid = 'interlis_settings.url_standort' and locale = 'de') 
),


-- all sites of the list of vflz_ids
standorte as (
    select 'stao'||v.vflz_id::text as stao_tid,
        v.vflz_id,
        v.vfl_id,
        v.vflz_combined_id_kt,
        vflgeo.wkb_geometry,
        vflnr.c_org_kuerzel,
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid,
        bem_standort.bem as standort_bemerkungen,
        zentroid as wkb_point,
        staotyp_mapping.code_long as staotyp,
        v.c_vflz_deponietyp::text as deponietyp,
        case when v.nachsorge = true then true::text else false::text end as nachsorge,
        v.dat_rechtskraft::date as date_ersteintrag,
        (   -- legally binding date
            select vflz_is_published_v.dat_latest_published::text as dat_latest_published
               from alma.vflz_is_published_v
               where (vflz_is_published_v.vflz_id in ( select vflz_any_in_vfl.vflz_id
                                    from alma.vflz vflz_any_in_vfl
                                    where vflz_any_in_vfl.vfl_id = v.vfl_id)
                    ) and vflz_is_published_v.is_latest_published
        )::date as date_letzteanpassung,
        statusaltlv_mapping.code_long as statusaltlv,
        case when v.in_betrieb = true then true::text else false::text end as in_betrieb,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') is not null then
          (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_katasterauszug' and locale = 'de') 
          || (regexp_replace(vfilename.filename::text, ' '::text, '%20'::text, 'g'::text))
          else null end as url_kbs_datasheet,
          v.bezeichnung as bezeichnung,
          alma.translate_code(alma.msgid_code(v.h_vflz_bearbstand, v.c_vflz_bearbstand), 'de'::text) as bearbeitungsstand
    from alma.vflz v
    join alma.vflz_current_v vic on v.vflz_id = vic.vflz_id and vic.is_current /* only published versions */
    left join alma_export.interlis_cod_mapping_v staotyp_mapping on staotyp_mapping.c_cli_id = v.h_vflz_vftyp
                and staotyp_mapping.code = v.c_vflz_vftyp
    left join alma.bere on bere.vflz_id = v.vflz_id 
    left join alma.cod_kbsinfo info on info.h_bere_res_abwbewe = bere.h_bere_res_abwbewe and info.c_bere_res_abwbewe=bere.c_bere_res_abwbewe and info.belastet
    left join alma_export.interlis_cod_mapping_v statusaltlv_mapping on statusaltlv_mapping.c_cli_id = bere.h_bere_res_abwbewe
                and statusaltlv_mapping.code = bere.c_bere_res_abwbewe
    left join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv

    left join alma.vflgeo on vflgeo.vflz_id = v.vflz_id
    left join alma.bemgrp bemg_standort on bemg_standort.public and bemg_standort.bemgrp='standort'
    left join alma.bem bem_standort on bem_standort.bemgrp_id = bemg_standort.bemgrp_id and
                bem_standort.key_value = v.vflz_id and bem_standort.public

    left join alma_export.vflz_filename_v vfilename on vfilename.vflz_id = v.vflz_id

    where v.vfl_id in (
        select vfl_id from alma.vflz where vflz_id = any($1)
    )
    and vflnr.c_org_kuerzel in (
        select distinct trim(unnest(string_to_array(msgstr, ',')))
        from alma.translations
        where msgid in ('interlis_settings.aemter_vollzug', 'interlis_settings.amt_kuerzel')
            and locale = 'de'
            and msgstr is not null
            and msgstr != ''
    )
    order by v.vflz_id
),

branche as (
select bran.*
from (
      select vflz_id, 
      alma.translate_code(alma.msgid_code(intb.h_intb_bran, intb.c_intb_bran), 'de'::text) as branchenbezeichnung
      from alma.intb  
) bran
join standorte s on bran.vflz_id = s.vflz_id
),


branche_xml as (
select bran.vflz_id,
        xmlelement(name "KbS_V1_5_LU_V1.Branche",
        xmlelement(name "value", bran.branchenbezeichnung)
    )as x_v14
from branche bran
),

geoportallinks as (
    select
        standorte.vflz_id,
        case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'standortnummer' then
          wmsprops.url_geoportal || (regexp_replace(standorte.vflz_combined_id_kt::text, ' '::text, '%20'::text, 'g'::text))
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'xy_koordinates' then
           wmsprops.url_geoportal || '&y=' || st_x(standorte.wkb_point)::text || '&x=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'map_x_map_y_koordinates' then
           wmsprops.url_geoportal || '&map_x=' || st_x(standorte.wkb_point)::text || '&map_y=' || st_y(standorte.wkb_point)::text
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'c_koordinates' then
           wmsprops.url_geoportal || '&c=' || st_y(standorte.wkb_point)::text || ',' || st_x(standorte.wkb_point)::text 
        when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_standort_indikator' and locale = 'de') = 'ne_koordinates' then
           wmsprops.url_geoportal || '&E=' || st_x(standorte.wkb_point)::text || '&N=' || st_y(standorte.wkb_point)::text
        else wmsprops.url_geoportal 
        end as permalink_geoportal
    from standorte, wmsprops
),


-- saved parcels for all returned sites
parzellen as (
  select 
    grun.h_nb_id as nbident, 
    grun.h_gem_id as h_gem_id,
    grun.egrid as egrid,
    v.vflz_id as vflz_id, 
    grun.gb_nummer as parzelle 
  from standorte v
  left join alma.bet on v.vflz_id = bet.vflz_id
  left join alma.bet_art using (bet_id)
  left join alma.grun using (grun_id)
  where not (grun.h_nb_id is null and grun.h_gem_id is null and grun.egrid is null and grun.gb_nummer is null)
  group by grun.h_nb_id, grun.h_gem_id, grun.egrid, v.vflz_id, grun.gb_nummer

),

-- saved parcels in xml form
parzellen_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5.Parzellenidentifikation",
        xmlelement(name "NBIdent", parzellen.nbident),
        xmlelement(name "Parzellennummer", parzellen.parzelle)
    ) as x_v15
from parzellen
where parzellen.nbident is not null and parzellen.parzelle is not null
order by parzellen.parzelle
),

--egrid in xml form
egrid_xml as (
select parzellen.vflz_id,
        xmlelement(name "KbS_V1_5.EGRID_",
            xmlelement(name "value", parzellen.egrid)
        )
    as x_v15
from parzellen
where parzellen.egrid is not null
order by parzellen.parzelle
),



-- parcels from external data for all returned sites
parzellen_cache as (
  select 
    grun.h_nb_id as nbident, 
    grun.h_gem_id as h_gem_id,
    grun.egrid as egrid,
    v.vflz_id as vflz_id, 
    grun.gb_nummer as parzelle 
  from standorte v
  join alma.grun on st_intersects(v.wkb_geometry, grun.wkb_geometry)
  left join alma.h_gem on h_gem.bfs_nummer = grun.h_gem_id
  left join alma.h_nb on grun.h_nb_id = h_nb.h_nb_id
  where not (grun.h_nb_id is null and grun.h_gem_id is null and grun.egrid is null and grun.gb_nummer is null)
  group by grun.h_nb_id, grun.h_gem_id, grun.egrid, v.vflz_id, grun.gb_nummer
),

-- parcels in xml form
parzellen_cache_xml as (
select parzellen_cache.vflz_id,
        xmlelement(name "KbS_V1_5.Parzellenidentifikation",
        xmlelement(name "NBIdent", parzellen_cache.nbident),
        xmlelement(name "Parzellennummer", parzellen_cache.parzelle)
    ) as x_v15
from parzellen_cache
where parzellen_cache.nbident is not null and parzellen_cache.parzelle is not null
order by parzellen_cache.parzelle
),

-- egrid in xml form
egrid_cache_xml as (
select parzellen_cache.vflz_id,
        xmlelement(name "KbS_V1_5.EGRID_",
            xmlelement(name "value", parzellen_cache.egrid)
        )
    as x_v15
from parzellen_cache
where parzellen_cache.egrid is not null
order by parzellen_cache.parzelle
),



untersuchungsmassnahmen_pre_vfl as (
select massn.*
from (
      select tm.code_long, tm.ili_code, tm.ili_c_cli_id, v.vfl_id from alma_export.interlis_task_mapping_v tm join alma.vflz v on v.c_vflz_unterstand = tm.a4w_code
) massn
join standorte s on massn.vfl_id = s.vfl_id
),

untersuchungsmassnahmen_vfl as (
select
    s.vfl_id, up.code_long, up.ili_code, up.ili_c_cli_id
from untersuchungsmassnahmen_pre_vfl up
join standorte s on up.vfl_id = s.vfl_id
union
-- provide untmassn1 if no other untersuchungsmassnahme is available
select s.vfl_id, 'UntMassn1' as code_long, 'UM1' as ili_code, 20023 as ili_c_cli_id
from standorte s
    where s.vfl_id not in (select vfl_id from untersuchungsmassnahmen_pre_vfl)
    ),

untersuchungsmassnahmen_xml_vfl as (
select um.vfl_id,
        xmlelement(name "KbS_V1_5.UntersMassn_",
        xmlelement(name "value", um.code_long)
    ) as x_v15
from untersuchungsmassnahmen_vfl um
),


untersuchungsmassnahmen_pre_vflz as (
select massn.*
from (
      select tm.code_long, tm.ili_code, tm.ili_c_cli_id, v.vfl_id, v.vflz_id from alma_export.interlis_task_mapping_v tm join alma.vflz v on v.c_vflz_unterstand = tm.a4w_code
) massn
join standorte s on massn.vflz_id = s.vflz_id
),

untersuchungsmassnahmen_vflz as (
select
    s.vflz_id, s.vfl_id, up.code_long, up.ili_code, up.ili_c_cli_id
from untersuchungsmassnahmen_pre_vflz up
join standorte s on up.vflz_id = s.vflz_id
union
-- provide untmassn1 if no other untersuchungsmassnahme is available
select s.vflz_id, s.vfl_id, 'UntMassn1' as code_long, 'UM1' as ili_code, 20023 as ili_c_cli_id
from standorte s
    where s.vflz_id not in (select vflz_id from untersuchungsmassnahmen_pre_vflz)
    ),



untersuchungsmassnahmen_xml_vflz as (
select um.vflz_id,
        xmlelement(name "KbS_V1_5.UntersMassn_",
        xmlelement(name "value", um.code_long)
    ) as x_v15
from untersuchungsmassnahmen_vflz um
),


-- sites in xml form

standorte_xml_v15 as (
    select xmlelement(name "KbS_V1_5.Belastete_Standorte.Belasteter_Standort",
          xmlattributes(standorte.stao_tid as "TID"),
          xmlelement(name "Katasternummer", standorte.vflz_combined_id_kt),
          xmlelement(name "Bezeichnung", standorte.bezeichnung),
          xmlelement(name "Bearbeitungsstand", standorte.bearbeitungsstand),
          case
               when exists(select vflz_id from branche_xml where branche_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Branchenbezeichnung",
                        (select xmlagg(x_v14) from branche_xml where branche_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Branchenbezeichnung not available')
          end,
          case when geoportallinks.permalink_geoportal is not null then
            xmlelement(name "URL_Standort", 
                xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",
                    xmlelement(name "LocalisedText",
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'de'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=de'))
                        ), 
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",   
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                then xmlelement(name "Language", 'rm')
                                else xmlelement(name "Language", 'fr') end,
                            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                     then xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=rm'))
                                    else xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=fr')) end
                        ),
                        xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",
                            xmlelement(name "Language", 'it'),
                            xmlelement(name "Text", concat(geoportallinks.permalink_geoportal, '&lang=it'))
                        )
                    )
                )
            )
          else 
            xmlelement(name "URL_Standort", geoportallinks.permalink_geoportal)
          end,
          case when standorte.wkb_geometry is not null then
              case when st_geometrytype(standorte.wkb_geometry) = 'ST_Point' then
                  xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              else
                  xmlelement(name "Geo_Lage_Polygon", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
              end
          else
              xmlelement(name "Geo_Lage_Punkt", alma_export.interlis_kbs_v1_5_geometry(st_transform((standorte.wkb_geometry), 2056)))
          end,
          case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.parzellen' and locale = 'de')= 'cache' then
              case
               when exists(select vflz_id from parzellen_cache_xml where parzellen_cache_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x_v15) from parzellen_cache_xml where parzellen_cache_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
              end
            else
              case
               when exists(select vflz_id from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "Parzellenverweis",
                        (select xmlagg(x_v15) from parzellen_xml where parzellen_xml.vflz_id = standorte.vflz_id)
                  )
               else
                  xmlcomment('Parzellenverweis not available')
              end
          end,
          case
               when exists(select vflz_id from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id) then
                  xmlelement(name "EGRID", 
                        (select xmlagg(x_v15) from egrid_xml where egrid_xml.vflz_id = standorte.vflz_id)
                    )
                else
                    xmlcomment('EGRID not available')
          end, 
          xmlelement(name "Standorttyp", standorte.staotyp),
          xmlelement(name "InBetrieb", standorte.in_betrieb),
          case
               when standorte.deponietyp is not null then
                  xmlelement(name "Deponietyp", xmlelement(name "KbS_V1_5.Deponietyp_",
                        xmlelement(name "value", standorte.deponietyp)
                        )
                  )
                else
                    xmlcomment('Deponietyp not available')
          end,
          case
                when standorte.nachsorge is not null then
                    xmlelement(name "Nachsorge", standorte.nachsorge)
                else
                    xmlcomment('Nachsorge not available')
          end,
          case 
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'alle nach standortversionen' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x_v15) from untersuchungsmassnahmen_xml_vfl where untersuchungsmassnahmen_xml_vfl.vfl_id = standorte.vfl_id))
                when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.mapping_untersuchungsmassnahmen' and locale = 'de') = 'aktuellste' then
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x_v15) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
                else 
                  xmlelement(name "Untersuchungsmassnahmen", (select xmlagg(x_v15) from untersuchungsmassnahmen_xml_vflz where untersuchungsmassnahmen_xml_vflz.vflz_id = standorte.vflz_id))
          end,
          xmlelement(name "StatusAltlV", standorte.statusaltlv),
          xmlelement(name "Ersteintrag", standorte.date_ersteintrag::date),
          xmlelement(name "LetzteAnpassung", standorte.date_letzteanpassung::date),
          xmlelement(name "URL_KbS_Auszug",                                                                                                                                                               
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                          
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'de'),                                                                                                                                                
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     ),                                                                                                                                                                                    
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                        
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                   
                     xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                                  
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                          
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", standorte.url_kbs_datasheet)                                                                                                                              
                     )                                                                                                                                                                                     
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
           ),   
          xmlcomment('Bemerkung not available'),
          xmlelement(name "ZustaendigkeitKataster",
            xmlattributes(
                standorte.zb_tid as "REF"
            )
          )
      ) as x
    from standorte
    join geoportallinks on geoportallinks.vflz_id = standorte.vflz_id
    order by standorte.stao_tid
),


-- org
zustaendige_behoerde as (
select
        'zb'||(select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_id' and locale = 'de') as zb_tid, /* this id also gets build in the standorte with-clause*/
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'de') as behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'fr') as behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt' and locale = 'it') as behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'de') as url_behoerde_de,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_fr,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'fr') as url_behoerde_rm,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_url' and locale = 'it') as url_behoerde_it,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_uid' and locale = 'de') as uid,
        (select'interlis_settings.katastername') as katastername,
        (select msgstr from alma.translations s where s.msgid = 'interlis_settings.url_kbs_auszug' and locale = 'de') as url_webgis
),

-- org as xml
zustaendige_behoerde_xml as (
    select 
    xmlelement(name "KbS_V1_5.Belastete_Standorte.ZustaendigkeitKataster",
      xmlattributes(zustaendige_behoerde.zb_tid as "TID"),
      xmlelement(name "Zustaendige_Behoerde", 
        xmlelement(name "LocalisationCH_V1.MultilingualText",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr' 
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "LocalisationCH_V1.LocalisedText",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                          
      ),

      xmlelement(name "URL_Behoerde",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_de)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
            case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_fr)                                                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", zustaendige_behoerde.url_behoerde_it)                                                                                                                    
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         ), 

      xmlelement(name "UID", zustaendige_behoerde.uid),
      xmlelement(name "Katastername",
            alma_export.interlis_kbs_localisedtext_t(zustaendige_behoerde.katastername, 
            array['de',
                    case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                        then 'rm' 
                    else 'fr' end,
                    'it'
                ])
      ),

      xmlelement(name "URL_Kataster",                                                                                                                                                                     
             xmlelement(name "KbS_V1_5.Belastete_Standorte.MultilingualUri",                                                                                                                               
                 xmlelement(name "LocalisedText",                                                                                                                                                         
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'de'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=de'))                                                                                                     
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                             then xmlelement(name "Language", 'rm')                                                                                                                                       
                             else xmlelement(name "Language", 'fr') end,                                                                                                                                  
                         case when (select msgstr from alma.translations s where s.msgid = 'interlis_settings.amt_kuerzel' and locale = 'de')= 'gr'
                                  then xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=rm'))                                                                                       
                                 else xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=fr')) end                                                                                    
                     ),                                                                                                                                                                                   
                     xmlelement(name "KbS_V1_5.Belastete_Standorte.LocalisedUri",                                                                                                                         
                         xmlelement(name "Language", 'it'),                                                                                                                                               
                         xmlelement(name "Text", concat(zustaendige_behoerde.url_webgis, '&lang=it'))                                                                                                     
                     )                                                                                                                                                                                    
                 )                                                                                                                                                                                        
             )                                                                                                                                                                                            
         )   


    ) as x_v15
    from zustaendige_behoerde
)

-- assembling of the finished xml document according to the interlis schema
select xmlelement(name "TRANSFER", xmlattributes('http://www.interlis.ch/INTERLIS2.3' as xmlns),
    xmlelement(name "HEADERSECTION",
        xmlattributes('alma' as "SENDER", '2.3' as "VERSION"),
          xmlelement(name "MODELS", -- need to add all used models by hand
              xmlelement(name "MODEL",xmlattributes('CoordSys' as "NAME",'2015-11-24' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('InternationalCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Localisation_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('LocalisationCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Dictionaries_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('DictionariesCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('Units' as "NAME",'2012-02-20' as "VERSION",'https://www.interlis.ch/models' as "URI")),
              xmlelement(name "MODEL",xmlattributes('GeometryCHLV95_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
              xmlelement(name "MODEL",xmlattributes('KbS_V1_5' as "NAME",'2021-10-15' as "VERSION",'https://models.geo.admin.ch/BAFU' as "URI"))
          )
    ),
   
    xmlelement(name "DATASECTION",
        xmlelement(name "KbS_V1_5.Belastete_Standorte",-- there is no attribute that could server as a bucket-identifier. so we generate an artiffical one.
            xmlattributes((select bid from bidprops) as "BID"),
                ( select xmlagg(x_v15) from zustaendige_behoerde_xml),
                ( select xmlagg(x) from standorte_xml_v15)
        )
    )

);

$_$;

comment on function alma_export.interlis_lu is 'Generieren der INTERLIS XTF Datei für die LU Version. 
    Der Export beinhaltet alle aktuellen Standorte';


drop function if exists alma_export.interlis_so_geometry(p_geom public.geometry);

create function alma_export.interlis_so_geometry(p_geom public.geometry) returns xml
    language plpgsql strict
    as $$
declare
    result xml;
begin
    if st_geometrytype(p_geom) = 'ST_MultiPolygon' then
        if st_srid(p_geom) != 2056 then
            raise 'unsupported geometry srid: %', st_srid(p_geom);
        end if;
        select xmlelement(name "GeometryCHLV95_V1.MultiSurface",
            xmlelement(name "Surfaces", xmlagg(
                xmlelement(name "GeometryCHLV95_V1.SurfaceStructure",
                    xmlelement(name "Surface", alma_export.interlis_geometry_polygon(
                        st_geometryn(p_geom, surface_number)
                    ))
                ) order by surface_number
            ))
        ) into result
        from generate_series(1, st_numgeometries(p_geom)) as surfaces(surface_number);
    else
        result := alma_export.interlis_kbs_v1_5_geometry(p_geom);
    end if;
    return result;
end
$$;

comment on function alma_export.interlis_so_geometry is 'INTERLIS XML Export fuer Solothurn Geometrien';


drop function if exists alma_export.interlis_so(p_vflz_ids integer[]);

create function alma_export.interlis_so(p_vflz_ids integer[]) returns xml
    language sql
    as $_$

with bidprops as (
    select 'SO_AFU_KbS_Publikation' || msgstr as bid,
        msgstr as amt_kuerzel
    from alma.translations
    where msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'
),

standorte as (
    select 'stao'||v.vflz_id::text as stao_tid,
        v.vflz_combined_id_kt,
        vflgeo.wkb_geometry,
        alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), 'de') as staotyp,
        alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'de') as bewertung,
        concat(
            alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), 'de'),
            ' / ',
            alma.translate_code(alma.msgid_code(v.h_vflz_bearbstand, v.c_vflz_bearbstand), 'de')
        ) as stand,
        case when vflnr.c_org_kuerzel = (select amt_kuerzel from bidprops) then vflnr.c_org_kuerzel
            else 'andere'
        end as vollzug
    from alma.vflz v
    join alma.vflz_is_published_v vip on v.vflz_id = vip.vflz_id and vip.is_latest_published
    join alma_export.interlis_cod_mapping_v staotyp_mapping on staotyp_mapping.c_cli_id = v.h_vflz_vftyp
        and staotyp_mapping.code = v.c_vflz_vftyp
    join alma.bere on bere.vflz_id = v.vflz_id
    join alma.cod_kbsinfo info on info.h_bere_res_abwbewe = bere.h_bere_res_abwbewe
        and info.c_bere_res_abwbewe = bere.c_bere_res_abwbewe and info.belastet
    join alma_export.interlis_cod_mapping_v statusaltlv_mapping on statusaltlv_mapping.c_cli_id = bere.h_bere_res_abwbewe
        and statusaltlv_mapping.code = bere.c_bere_res_abwbewe
    join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv
    left join alma.vflgeo on vflgeo.vflz_id = v.vflz_id
    where v.vfl_id in (
        select vfl_id from alma.vflz where vflz_id = any($1)
    )
    and vflnr.c_org_kuerzel in (
        select distinct trim(unnest(string_to_array(msgstr, ',')))
        from alma.translations
        where msgid in ('interlis_settings.aemter_vollzug', 'interlis_settings.amt_kuerzel')
            and locale = 'de'
            and msgstr is not null
            and msgstr != ''
    )
),

standorte_xml as (
    select standorte.stao_tid,
        xmlelement(name "model_so.Belastete_Standorte.Belasteter_Standort",
            xmlattributes(standorte.stao_tid as "TID"),
            xmlelement(name "Standortnummer", standorte.vflz_combined_id_kt),
            xmlelement(name "Standorttyp", standorte.staotyp),
            xmlelement(name "Bewertung", standorte.bewertung),
            xmlelement(name "Stand", standorte.stand),
            xmlelement(name "Vollzug", standorte.vollzug),
            xmlelement(name "Geometrie", alma_export.interlis_so_geometry(st_transform(standorte.wkb_geometry, 2056)))
        ) as x
    from standorte
)

select xmlelement(name "TRANSFER", xmlattributes('http://www.interlis.ch/INTERLIS2.3' as xmlns),
    xmlelement(name "HEADERSECTION",
        xmlattributes('alma' as "SENDER", '2.3' as "VERSION"),
        xmlelement(name "MODELS",
            xmlelement(name "MODEL",xmlattributes('CoordSys' as "NAME",'2015-11-24' as "VERSION",'https://www.interlis.ch/models' as "URI")),
            xmlelement(name "MODEL",xmlattributes('InternationalCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('Localisation_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('LocalisationCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('Dictionaries_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('DictionariesCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('Units' as "NAME",'2012-02-20' as "VERSION",'https://www.interlis.ch/models' as "URI")),
            xmlelement(name "MODEL",xmlattributes('GeometryCHLV95_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('SO_AFU_KbS_Publikation__20230104' as "NAME",'2023-01-04' as "VERSION",'https://afu.so.ch' as "URI"))
        )
    ),
    xmlelement(name "DATASECTION",
        xmlelement(name "model_so.Belastete_Standorte",
            xmlattributes((select bid from bidprops) as "BID"),
            (select xmlagg(x order by stao_tid) from standorte_xml)
        )
    )
);

$_$;

comment on function alma_export.interlis_so is 'Generieren der INTERLIS XTF Datei fuer das kantonale Modell von Solothurn.
    Der Export beinhaltet alle publizierten Standorte nach der Altlast Verordnung';






drop function if exists alma_export.interlis_so_restricted(p_vflz_ids integer[]);

create function alma_export.interlis_so_restricted(p_vflz_ids integer[]) returns xml
    language sql
    as $_$

with bidprops as (
    select 'SO_AFU_KbS_Publikation' || msgstr as bid,
        msgstr as amt_kuerzel
    from alma.translations
    where msgid = 'interlis_settings.amt_kuerzel' and locale = 'de'
),

standorte as (
    select 'stao'||v.vflz_id::text as stao_tid,
        v.vflz_id,
        v.vfl_id,
        v.vflz_combined_id_kt,
        v.bezeichnung,
        vflgeo.wkb_geometry,
        alma.translate_code(alma.msgid_code(v.h_org_kuerzel, v.c_org_kuerzel), 'de') as org_id,
        'zb'||v.c_org_kuerzel::text as zb_tid,
        alma.translate_code(alma.msgid_code(v.h_vflz_vftyp, v.c_vflz_vftyp), 'de') as staotyp,
        alma.translate_code(alma.msgid_code(v.h_vflz_bearbstand, v.c_vflz_bearbstand), 'de') as bearbeitungsstand,
        alma.translate_code(alma.msgid_code(bere.h_bere_res_abwbewe, bere.c_bere_res_abwbewe), 'de') as bewertung,
        alma.translate_code(alma.msgid_code(v.h_vflz_unterstand, v.c_vflz_unterstand), 'de') as untersuchungsstand,
        v.c_org_kuerzel as org_id,
        case when vflnr.c_org_kuerzel = (select amt_kuerzel from bidprops) then vflnr.c_org_kuerzel
            else 'andere'
        end as vollzug
    from alma.vflz v
    join alma.vflz_current_v vic on v.vflz_id = vic.vflz_id and vic.is_current
    join alma.bere on bere.vflz_id = v.vflz_id and bere.c_bere_res_abwbewe != '00'
    join alma.vflnr on v.vflz_id = vflnr.vflz_id and vflnr.aktiv
    join alma.vflgeo on vflgeo.vflz_id = v.vflz_id
    where v.vfl_id in (
        select vfl_id from alma.vflz where vflz_id = any($1)
    )
    and vflnr.c_org_kuerzel in (
        select distinct trim(unnest(string_to_array(msgstr, ',')))
        from alma.translations
        where msgid in ('interlis_settings.aemter_vollzug', 'interlis_settings.amt_kuerzel')
            and locale = 'de'
            and msgstr is not null
            and msgstr != ''
    )
), 

standorte_xml as (
    select standorte.stao_tid,
        xmlelement(name "model_so.Belastete_Standorte.Belasteter_Standort",
            xmlattributes(standorte.stao_tid as "TID"),
            xmlelement(name "Standortnummer", standorte.vflz_combined_id_kt),
            xmlelement(name "Bezeichnung", standorte.bezeichnung),          
            xmlelement(name "Standorttyp", standorte.staotyp),
            xmlelement(name "Bearbeitungsstand", standorte.bearbeitungsstand),
            xmlelement(name "Bewertung", standorte.bewertung),
            xmlelement(name "Untersuchungsstand", standorte.untersuchungsstand),
            xmlelement(name "Vollzug", standorte.vollzug),
            xmlelement(name "Geometrie", alma_export.interlis_so_geometry(st_transform(standorte.wkb_geometry, 2056)))
        ) as x
    from standorte
)

select xmlelement(name "TRANSFER", xmlattributes('http://www.interlis.ch/INTERLIS2.3' as xmlns),
    xmlelement(name "HEADERSECTION",
        xmlattributes('alma' as "SENDER", '2.3' as "VERSION"),
        xmlelement(name "MODELS",
            xmlelement(name "MODEL",xmlattributes('CoordSys' as "NAME",'2015-11-24' as "VERSION",'https://www.interlis.ch/models' as "URI")),
            xmlelement(name "MODEL",xmlattributes('InternationalCodes_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('Localisation_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('LocalisationCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('Dictionaries_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('DictionariesCH_V1' as "NAME",'2011-08-30' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('Units' as "NAME",'2012-02-20' as "VERSION",'https://www.interlis.ch/models' as "URI")),
            xmlelement(name "MODEL",xmlattributes('GeometryCHLV95_V1' as "NAME",'2015-11-12' as "VERSION",'https://www.geo.admin.ch' as "URI")),
            xmlelement(name "MODEL",xmlattributes('SO_AFU_KbS_Publikation_restricted_20221209' as "NAME",'2023-01-04' as "VERSION",'https://afu.so.ch' as "URI"))
        )
    ),
    xmlelement(name "DATASECTION",
        xmlelement(name "model_so.Belastete_Standorte",
            xmlattributes((select bid from bidprops) as "BID"),
            (select xmlagg(x order by stao_tid) from standorte_xml)
        )
    )
);

$_$;

comment on function alma_export.interlis_so_restricted is 'Generieren der INTERLIS XTF Datei fuer das kantonale Modell von Solothurn.
    Der Export beinhaltet alle aktuellen Standorte';
