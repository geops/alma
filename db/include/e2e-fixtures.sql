--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: _kantone; Type: TABLE DATA; Schema: alma; Owner: alma
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE alma._kantone DISABLE TRIGGER ALL;

COPY alma._kantone (ktnr, gdekt, gdektna) FROM stdin;
\.


ALTER TABLE alma._kantone ENABLE TRIGGER ALL;

--
-- Data for Name: bem; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.bem DISABLE TRIGGER ALL;

COPY alma.bem (bem_id, bemgrp_id, public, sort, bem, key_value, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
4	1	f	\N	Test Bemerkung für Betriebsstandort	2	2024-07-11 08:40:14.167958	alma	\N	\N	t
8	1	f	\N	Test Bemerkung für Schiessanlagenstandort	4	2024-09-17 09:08:58.399706	\N	\N	\N	t
6	1	f	\N	Test Bemerkung für Unfallstandort	3	2024-09-18 06:54:38.046328	bearbeiten-sachdaten	\N	\N	t
2	3	f	\N	Test Bemerkung für Ablagerung	1	2024-07-09 13:29:08.349682	alma	2024-10-15 07:03:37.723549	bearbeiten-sachdaten	t
13	16	f	\N	Test Bemerkung Einzelereignis	1	2024-09-20 11:26:00.83961	\N	2024-10-15 07:03:37.740375	bearbeiten-sachdaten	t
12	15	f	\N	Test Bemerkung Umweltschaden	1	2024-09-20 11:25:36.485594	\N	2024-10-15 07:03:37.742904	bearbeiten-sachdaten	t
7	4	f	\N	Test Bemerkung für Unfall	1	2024-09-17 08:16:17.604735	\N	2024-10-15 07:03:50.423763	bearbeiten-sachdaten	t
9	2	f	\N	Test Bemerkung für Schiessanlage	2	2024-09-17 09:38:07.529223	\N	2024-10-15 07:03:57.610017	bearbeiten-sachdaten	t
10	17	f	\N	Test Begründung Bewertung Schiessanlage	2	2024-09-17 09:38:07.529223	\N	2024-10-15 07:03:57.61085	bearbeiten-sachdaten	t
3	2	f	\N	Test Bemerkung für Betrieb	1	2024-07-10 08:00:20.591664	alma	2025-09-18 09:38:18.731958	admin	t
5	17	f	\N	Test Begründung Bewertung Betrieb	1	2024-09-10 11:27:57.158057	\N	2025-09-18 09:38:18.733684	admin	t
15	1	f	\N	Test Bemerkung für Ablagerungsstandort	1	2025-09-18 09:38:18.653356	admin	\N	\N	t
14	18	f	\N	Test Bemerkung für Kinderspielplatz	1	2025-09-18 08:05:58.719881	admin	2025-09-18 09:40:32.486205	admin	t
17	1	f	\N	Test Bemerkung für Kinderspielplatz	5	2025-09-18 09:43:42.644283	admin	\N	\N	t
16	5	f	\N	Test Bemerkung für Umwelt von Ablagerungsstandort	1	2025-09-18 09:38:18.65583	admin	\N	\N	t
32	19	f	\N	Test Begründung Bewertung Kinderspielplatz	1	2025-10-22 12:08:47.101398	admin	\N	\N	t
33	20	f	\N	Test Bemerkung für PFAS	1	2025-10-22 12:08:47.298086	admin	\N	\N	t
34	21	f	\N	Test Begründung Bewertung PFAS	1	2025-10-22 12:08:47.302272	admin	\N	\N	t
35	1	f	\N	Test Bemerkung für PFAS-Standort	6	2025-10-22 12:08:47.3417	admin	\N	\N	t
\.


ALTER TABLE alma.bem ENABLE TRIGGER ALL;

--
-- Data for Name: c_cli; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.c_cli DISABLE TRIGGER ALL;

COPY alma.c_cli (c_cli_id, c_status, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
\.


ALTER TABLE alma.c_cli ENABLE TRIGGER ALL;

--
-- Data for Name: flugplatz; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.flugplatz DISABLE TRIGGER ALL;

COPY alma.flugplatz (flugplatz_id, art, h_flugplatz_bezeichnung, c_flugplatz_bezeichnung, icao, abk, c_kt, zusatz, wkb_geometry) FROM stdin;
1	Flugplatz A	600	ZRH	A	A	1	zusatz	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241
2	Flugplatz B	600	DXB	B	B	1	zusatz	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241
\.


ALTER TABLE alma.flugplatz ENABLE TRIGGER ALL;

--
-- Data for Name: ktu; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.ktu DISABLE TRIGGER ALL;

COPY alma.ktu (ktu_id, h_ktu, c_ktu, rangefrom, rangeto) FROM stdin;
1	210	BLS	10001	15000
2	210	SBB	15001	199999
\.


ALTER TABLE alma.ktu ENABLE TRIGGER ALL;

--
-- Data for Name: obje; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.obje DISABLE TRIGGER ALL;

COPY alma.obje (obje_id, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
1	2024-06-25 07:49:23.291379	alma	2024-06-25 07:49:23.291379	\N
2	2024-07-10 07:44:40.218891	alma	2024-07-10 07:44:40.218891	\N
3	2024-08-07 13:12:27.966003	alma	2024-08-07 13:12:27.966003	\N
4	2024-08-27 14:13:09.823569	alma	2024-08-27 14:13:09.823569	\N
5	2024-08-27 14:13:09.823569	alma	2024-08-27 14:13:09.823569	\N
6	2024-08-27 14:13:09.823569	alma	2024-08-27 14:13:09.823569	\N
7	2024-11-08 09:00:00.000000	alma	2024-11-08 09:00:00.000000	\N
8	2024-11-09 09:00:00.000000	alma	2024-11-09 09:00:00.000000	\N
9	2024-11-10 09:00:00.000000	alma	2024-11-10 09:00:00.000000	\N
10	2024-11-11 09:00:00.000000	alma	2024-11-11 09:00:00.000000	\N
11	2024-11-12 09:00:00.000000	alma	2024-11-12 09:00:00.000000	\N
12	2024-11-13 09:00:00.000000	alma	2024-11-13 09:00:00.000000	\N
13	2024-11-14 09:00:00.000000	alma	2024-11-14 09:00:00.000000	\N
14	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
15	2024-11-16 09:00:00.000000	alma	2024-11-16 09:00:00.000000	\N
16	2024-11-17 09:00:00.000000	alma	2024-11-17 09:00:00.000000	\N
17	2024-11-18 09:00:00.000000	alma	2024-11-18 09:00:00.000000	\N
18	2024-11-19 09:00:00.000000	alma	2024-11-19 09:00:00.000000	\N
19	2024-11-20 09:00:00.000000	alma	2024-11-20 09:00:00.000000	\N
20	2024-11-21 09:00:00.000000	alma	2024-11-21 09:00:00.000000	\N
21	2024-11-22 09:00:00.000000	alma	2024-11-22 09:00:00.000000	\N
22	2024-11-23 09:00:00.000000	alma	2024-11-23 09:00:00.000000	\N
23	2024-11-24 09:00:00.000000	alma	2024-11-24 09:00:00.000000	\N
24	2024-11-25 09:00:00.000000	alma	2024-11-25 09:00:00.000000	\N
25	2024-11-26 09:00:00.000000	alma	2024-11-26 09:00:00.000000	\N
26	2024-11-27 09:00:00.000000	alma	2024-11-27 09:00:00.000000	\N
27	2024-11-28 09:00:00.000000	alma	2024-11-28 09:00:00.000000	\N
28	2024-11-01 09:00:00.000000	alma	2024-11-01 09:00:00.000000	\N
29	2024-11-02 09:00:00.000000	alma	2024-11-02 09:00:00.000000	\N
30	2024-11-03 09:00:00.000000	alma	2024-11-03 09:00:00.000000	\N
31	2024-11-04 09:00:00.000000	alma	2024-11-04 09:00:00.000000	\N
32	2024-11-05 09:00:00.000000	alma	2024-11-05 09:00:00.000000	\N
33	2024-11-06 09:00:00.000000	alma	2024-11-06 09:00:00.000000	\N
34	2024-11-07 09:00:00.000000	alma	2024-11-07 09:00:00.000000	\N
35	2024-11-08 09:00:00.000000	alma	2024-11-08 09:00:00.000000	\N
36	2024-11-09 09:00:00.000000	alma	2024-11-09 09:00:00.000000	\N
37	2024-11-10 09:00:00.000000	alma	2024-11-10 09:00:00.000000	\N
38	2024-11-11 09:00:00.000000	alma	2024-11-11 09:00:00.000000	\N
39	2024-11-12 09:00:00.000000	alma	2024-11-12 09:00:00.000000	\N
40	2024-11-13 09:00:00.000000	alma	2024-11-13 09:00:00.000000	\N
41	2024-11-14 09:00:00.000000	alma	2024-11-14 09:00:00.000000	\N
42	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
43	2024-11-16 09:00:00.000000	alma	2024-11-16 09:00:00.000000	\N
44	2024-11-17 09:00:00.000000	alma	2024-11-17 09:00:00.000000	\N
45	2024-11-18 09:00:00.000000	alma	2024-11-18 09:00:00.000000	\N
46	2024-11-19 09:00:00.000000	alma	2024-11-19 09:00:00.000000	\N
47	2024-11-20 09:00:00.000000	alma	2024-11-20 09:00:00.000000	\N
48	2024-11-21 09:00:00.000000	alma	2024-11-21 09:00:00.000000	\N
49	2024-11-22 09:00:00.000000	alma	2024-11-22 09:00:00.000000	\N
50	2024-11-23 09:00:00.000000	alma	2024-11-23 09:00:00.000000	\N
\.


ALTER TABLE alma.obje ENABLE TRIGGER ALL;

--
-- Data for Name: vflz; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.vflz DISABLE TRIGGER ALL;

COPY alma.vflz (vflz_id, vfl_id, obje_id, vflz_laufnr, vflz_combined_id_kt, bezeichnung, h_vflz_vftyp, c_vflz_vftyp, vflz_flurname, vflz_strasse, vflz_postleitzahl, vflz_ort, h_gem_id, zentroid, h_org_kuerzel, c_org_kuerzel, zeitraum_bis, zeitraum_von, zeitraum_bisheute, zeitraum_bisjahr, zeitraum_vonjahr, h_vflz_deponietyp, c_vflz_deponietyp, in_betrieb, nachsorge, h_vflz_gws_bereich, c_vflz_gws_bereich, h_vflz_gws_zone, c_vflz_gws_zone, h_vflz_durchlaessigkeit, c_vflz_durchlaessigkeit, h_vflz_karstgeb, c_vflz_karstgeb, h_vflz_bearbstand, c_vflz_bearbstand, h_vflz_unterstand, c_vflz_unterstand, rechtskraft, publizieren, dat_rechtskraft, dat_publizieren, lang, is_current, message, parent_id, vflz_created_date, erfassungs_datum, erfasser, mutations_datum, mutierer, ktu_id, flugplatz_id) FROM stdin;
1	1	1	1	A1	Ablagerungsstandort	63	01	AblagerungFlurname	AblagerungStrasse 123	1234	AblagerungOrt	1	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	2010-02-01	1980-08-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Foobar	\N	2024-10-01 00:00:00	2024-06-25 07:49:28.346327	alma	2025-09-18 09:38:18.655864	admin	1	\N
2	2	2	1	B1	Betriebsstandort	63	02	BetriebFlurname	BetriebStrasse 123	2345	BetriebOrt	1	01010000A0080800000000008052E343410000000048BF32410000000000F07A40	26030	A	2013-12-11	2010-01-01	f	f	t	12001	\N	\N	\N	10017	\N	10018	\N	58	\N	80	\N	55	\N	10023	\N	f	f	2014-03-02	\N	fr	t	Foobaz	\N	2024-10-02 00:00:00	2024-07-10 07:44:42.990582	alma	2025-09-18 09:38:18.758475	admin	\N	\N
3	3	3	1	U1	Unfallstandort	63	03	UnfallFlurname	UnfallStrasse 123	3456	UnfallOrt	3	01010000A0080800000000000053E343410000000049BF32410000000000007B40	26030	A	\N	2020-02-02	f	f	f	12001	\N	\N	\N	10017	\N	10018	\N	58	\N	80	\N	55	\N	10023	\N	f	f	\N	\N	de	t	Standort angelegt	\N	2024-10-03 00:00:00	2024-08-07 13:12:30.678312	alma	2024-10-15 07:17:03.94226	admin	\N	\N
4	4	4	1	S1	Schiessanlagenstandort	63	04	SchiessFlurname	SchiessStrasse 123	4567	SchiessOrt	4	01010000A0080800000000008053E34341000000004ABF32410000000000007B40	26030	A	2014-12-11	2012-01-01	f	f	f	12001	\N	\N	\N	10017	\N	10018	\N	58	\N	80	\N	\N	\N	10023	13	f	t	\N	2024-11-21	de	t	Standort angelegt	\N	2024-10-04 00:00:00	2024-07-24 12:40:59.575852	alma	2024-11-21 14:33:26.289993	admin	\N	\N
5	5	5	1	K1	Kinderspielplatz	63	05	KinderspielplatzFlurname	KinderspielplatzStrasse 123	2345	KinderspielplatzOrt	1	01010000A0080800000000000053E343410000000049BF32410000000000007B40	26030	A	2013-12-11	2010-01-01	f	f	t	12001	\N	\N	\N	10017	\N	10018	\N	58	\N	80	\N	55	\N	10023	\N	f	f	\N	\N	fr	t	Standort angelegt	\N	2024-10-05 00:00:00	2024-07-24 12:40:59.575852	alma	2025-10-22 12:08:47.182633	admin	\N	\N
6	6	6	1	P1	PFAS-Standort	63	06	PFAS-Flurname	PFAS-Strasse 123	2345	PFAS-Ort	1	01010000A0080800000000008052E343410000000048BF32410000000000F07A40	26030	A	2024-10-01	2023-10-01	f	f	f	12001	\N	\N	\N	10017	\N	10018	\N	58	\N	80	\N	55	\N	10023	\N	f	f	2014-03-02	\N	fr	t	Foobaz	\N	2024-10-02 00:00:00	2024-07-10 07:44:42.990582	alma	2025-10-22 12:08:47.34763	admin	\N	\N
7	7	7	1	T7	Dummy Standort 7	63	01	DummyFlurname7	DummyStrasse 7	1234	DummyOrt7	1	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 7 angelegt	\N	2024-11-08 00:00:00	2024-11-08 09:00:00.000000	alma	2024-11-08 09:00:00.000000	admin	1	\N
8	8	8	1	T8	Dummy Standort 8	63	01	DummyFlurname8	DummyStrasse 8	1234	DummyOrt8	2	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 8 angelegt	\N	2024-11-09 00:00:00	2024-11-09 09:00:00.000000	alma	2024-11-09 09:00:00.000000	admin	1	\N
9	9	9	1	T9	Dummy Standort 9	63	01	DummyFlurname9	DummyStrasse 9	1234	DummyOrt9	3	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 9 angelegt	\N	2024-11-10 00:00:00	2024-11-10 09:00:00.000000	alma	2024-11-10 09:00:00.000000	admin	1	\N
10	10	10	1	T10	Dummy Standort 10	63	01	DummyFlurname10	DummyStrasse 10	1234	DummyOrt10	4	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 10 angelegt	\N	2024-11-11 00:00:00	2024-11-11 09:00:00.000000	alma	2024-11-11 09:00:00.000000	admin	1	\N
11	11	11	1	T11	Dummy Standort 11	63	01	DummyFlurname11	DummyStrasse 11	1234	DummyOrt11	5	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 11 angelegt	\N	2024-11-12 00:00:00	2024-11-12 09:00:00.000000	alma	2024-11-12 09:00:00.000000	admin	1	\N
12	12	12	1	T12	Dummy Standort 12	63	01	DummyFlurname12	DummyStrasse 12	1234	DummyOrt12	6	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 12 angelegt	\N	2024-11-13 00:00:00	2024-11-13 09:00:00.000000	alma	2024-11-13 09:00:00.000000	admin	1	\N
13	13	13	1	T13	Dummy Standort 13	63	01	DummyFlurname13	DummyStrasse 13	1234	DummyOrt13	7	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 13 angelegt	\N	2024-11-14 00:00:00	2024-11-14 09:00:00.000000	alma	2024-11-14 09:00:00.000000	admin	1	\N
14	14	14	1	T14	Dummy Standort 14	63	01	DummyFlurname14	DummyStrasse 14	1234	DummyOrt14	8	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 14 angelegt	\N	2024-11-15 00:00:00	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	admin	1	\N
15	15	15	1	T15	Dummy Standort 15	63	01	DummyFlurname15	DummyStrasse 15	1234	DummyOrt15	1	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 15 angelegt	\N	2024-11-16 00:00:00	2024-11-16 09:00:00.000000	alma	2024-11-16 09:00:00.000000	admin	1	\N
16	16	16	1	T16	Dummy Standort 16	63	01	DummyFlurname16	DummyStrasse 16	1234	DummyOrt16	2	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 16 angelegt	\N	2024-11-17 00:00:00	2024-11-17 09:00:00.000000	alma	2024-11-17 09:00:00.000000	admin	1	\N
17	17	17	1	T17	Dummy Standort 17	63	01	DummyFlurname17	DummyStrasse 17	1234	DummyOrt17	3	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 17 angelegt	\N	2024-11-18 00:00:00	2024-11-18 09:00:00.000000	alma	2024-11-18 09:00:00.000000	admin	1	\N
18	18	18	1	T18	Dummy Standort 18	63	01	DummyFlurname18	DummyStrasse 18	1234	DummyOrt18	4	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 18 angelegt	\N	2024-11-19 00:00:00	2024-11-19 09:00:00.000000	alma	2024-11-19 09:00:00.000000	admin	1	\N
19	19	19	1	T19	Dummy Standort 19	63	01	DummyFlurname19	DummyStrasse 19	1234	DummyOrt19	5	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 19 angelegt	\N	2024-11-20 00:00:00	2024-11-20 09:00:00.000000	alma	2024-11-20 09:00:00.000000	admin	1	\N
20	20	20	1	T20	Dummy Standort 20	63	01	DummyFlurname20	DummyStrasse 20	1234	DummyOrt20	6	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 20 angelegt	\N	2024-11-21 00:00:00	2024-11-21 09:00:00.000000	alma	2024-11-21 09:00:00.000000	admin	1	\N
21	21	21	1	T21	Dummy Standort 21	63	01	DummyFlurname21	DummyStrasse 21	1234	DummyOrt21	7	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 21 angelegt	\N	2024-11-22 00:00:00	2024-11-22 09:00:00.000000	alma	2024-11-22 09:00:00.000000	admin	1	\N
22	22	22	1	T22	Dummy Standort 22	63	01	DummyFlurname22	DummyStrasse 22	1234	DummyOrt22	8	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 22 angelegt	\N	2024-11-23 00:00:00	2024-11-23 09:00:00.000000	alma	2024-11-23 09:00:00.000000	admin	1	\N
23	23	23	1	T23	Dummy Standort 23	63	01	DummyFlurname23	DummyStrasse 23	1234	DummyOrt23	1	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 23 angelegt	\N	2024-11-24 00:00:00	2024-11-24 09:00:00.000000	alma	2024-11-24 09:00:00.000000	admin	1	\N
24	24	24	1	T24	Dummy Standort 24	63	01	DummyFlurname24	DummyStrasse 24	1234	DummyOrt24	2	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 24 angelegt	\N	2024-11-25 00:00:00	2024-11-25 09:00:00.000000	alma	2024-11-25 09:00:00.000000	admin	1	\N
25	25	25	1	T25	Dummy Standort 25	63	01	DummyFlurname25	DummyStrasse 25	1234	DummyOrt25	3	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 25 angelegt	\N	2024-11-26 00:00:00	2024-11-26 09:00:00.000000	alma	2024-11-26 09:00:00.000000	admin	1	\N
26	26	26	1	T26	Dummy Standort 26	63	01	DummyFlurname26	DummyStrasse 26	1234	DummyOrt26	4	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 26 angelegt	\N	2024-11-27 00:00:00	2024-11-27 09:00:00.000000	alma	2024-11-27 09:00:00.000000	admin	1	\N
27	27	27	1	T27	Dummy Standort 27	63	01	DummyFlurname27	DummyStrasse 27	1234	DummyOrt27	5	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 27 angelegt	\N	2024-11-28 00:00:00	2024-11-28 09:00:00.000000	alma	2024-11-28 09:00:00.000000	admin	1	\N
28	28	28	1	T28	Dummy Standort 28	63	01	DummyFlurname28	DummyStrasse 28	1234	DummyOrt28	6	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 28 angelegt	\N	2024-11-01 00:00:00	2024-11-01 09:00:00.000000	alma	2024-11-01 09:00:00.000000	admin	1	\N
29	29	29	1	T29	Dummy Standort 29	63	01	DummyFlurname29	DummyStrasse 29	1234	DummyOrt29	7	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 29 angelegt	\N	2024-11-02 00:00:00	2024-11-02 09:00:00.000000	alma	2024-11-02 09:00:00.000000	admin	1	\N
30	30	30	1	T30	Dummy Standort 30	63	01	DummyFlurname30	DummyStrasse 30	1234	DummyOrt30	8	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 30 angelegt	\N	2024-11-03 00:00:00	2024-11-03 09:00:00.000000	alma	2024-11-03 09:00:00.000000	admin	1	\N
31	31	31	1	T31	Dummy Standort 31	63	01	DummyFlurname31	DummyStrasse 31	1234	DummyOrt31	1	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 31 angelegt	\N	2024-11-04 00:00:00	2024-11-04 09:00:00.000000	alma	2024-11-04 09:00:00.000000	admin	1	\N
32	32	32	1	T32	Dummy Standort 32	63	01	DummyFlurname32	DummyStrasse 32	1234	DummyOrt32	2	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 32 angelegt	\N	2024-11-05 00:00:00	2024-11-05 09:00:00.000000	alma	2024-11-05 09:00:00.000000	admin	1	\N
33	33	33	1	T33	Dummy Standort 33	63	01	DummyFlurname33	DummyStrasse 33	1234	DummyOrt33	3	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 33 angelegt	\N	2024-11-06 00:00:00	2024-11-06 09:00:00.000000	alma	2024-11-06 09:00:00.000000	admin	1	\N
34	34	34	1	T34	Dummy Standort 34	63	01	DummyFlurname34	DummyStrasse 34	1234	DummyOrt34	4	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 34 angelegt	\N	2024-11-07 00:00:00	2024-11-07 09:00:00.000000	alma	2024-11-07 09:00:00.000000	admin	1	\N
35	35	35	1	T35	Dummy Standort 35	63	01	DummyFlurname35	DummyStrasse 35	1234	DummyOrt35	5	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 35 angelegt	\N	2024-11-08 00:00:00	2024-11-08 09:00:00.000000	alma	2024-11-08 09:00:00.000000	admin	1	\N
36	36	36	1	T36	Dummy Standort 36	63	01	DummyFlurname36	DummyStrasse 36	1234	DummyOrt36	6	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 36 angelegt	\N	2024-11-09 00:00:00	2024-11-09 09:00:00.000000	alma	2024-11-09 09:00:00.000000	admin	1	\N
37	37	37	1	T37	Dummy Standort 37	63	01	DummyFlurname37	DummyStrasse 37	1234	DummyOrt37	7	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 37 angelegt	\N	2024-11-10 00:00:00	2024-11-10 09:00:00.000000	alma	2024-11-10 09:00:00.000000	admin	1	\N
38	38	38	1	T38	Dummy Standort 38	63	01	DummyFlurname38	DummyStrasse 38	1234	DummyOrt38	8	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 38 angelegt	\N	2024-11-11 00:00:00	2024-11-11 09:00:00.000000	alma	2024-11-11 09:00:00.000000	admin	1	\N
39	39	39	1	T39	Dummy Standort 39	63	01	DummyFlurname39	DummyStrasse 39	1234	DummyOrt39	1	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 39 angelegt	\N	2024-11-12 00:00:00	2024-11-12 09:00:00.000000	alma	2024-11-12 09:00:00.000000	admin	1	\N
40	40	40	1	T40	Dummy Standort 40	63	01	DummyFlurname40	DummyStrasse 40	1234	DummyOrt40	2	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 40 angelegt	\N	2024-11-13 00:00:00	2024-11-13 09:00:00.000000	alma	2024-11-13 09:00:00.000000	admin	1	\N
41	41	41	1	T41	Dummy Standort 41	63	01	DummyFlurname41	DummyStrasse 41	1234	DummyOrt41	3	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 41 angelegt	\N	2024-11-14 00:00:00	2024-11-14 09:00:00.000000	alma	2024-11-14 09:00:00.000000	admin	1	\N
42	42	42	1	T42	Dummy Standort 42	63	01	DummyFlurname42	DummyStrasse 42	1234	DummyOrt42	4	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 42 angelegt	\N	2024-11-15 00:00:00	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	admin	1	\N
43	43	43	1	T43	Dummy Standort 43	63	01	DummyFlurname43	DummyStrasse 43	1234	DummyOrt43	5	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 43 angelegt	\N	2024-11-16 00:00:00	2024-11-16 09:00:00.000000	alma	2024-11-16 09:00:00.000000	admin	1	\N
44	44	44	1	T44	Dummy Standort 44	63	01	DummyFlurname44	DummyStrasse 44	1234	DummyOrt44	6	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 44 angelegt	\N	2024-11-17 00:00:00	2024-11-17 09:00:00.000000	alma	2024-11-17 09:00:00.000000	admin	1	\N
45	45	45	1	T45	Dummy Standort 45	63	01	DummyFlurname45	DummyStrasse 45	1234	DummyOrt45	7	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 45 angelegt	\N	2024-11-18 00:00:00	2024-11-18 09:00:00.000000	alma	2024-11-18 09:00:00.000000	admin	1	\N
46	46	46	1	T46	Dummy Standort 46	63	01	DummyFlurname46	DummyStrasse 46	1234	DummyOrt46	8	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 46 angelegt	\N	2024-11-19 00:00:00	2024-11-19 09:00:00.000000	alma	2024-11-19 09:00:00.000000	admin	1	\N
47	47	47	1	T47	Dummy Standort 47	63	01	DummyFlurname47	DummyStrasse 47	1234	DummyOrt47	1	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 47 angelegt	\N	2024-11-20 00:00:00	2024-11-20 09:00:00.000000	alma	2024-11-20 09:00:00.000000	admin	1	\N
48	48	48	1	T48	Dummy Standort 48	63	01	DummyFlurname48	DummyStrasse 48	1234	DummyOrt48	2	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 48 angelegt	\N	2024-11-21 00:00:00	2024-11-21 09:00:00.000000	alma	2024-11-21 09:00:00.000000	admin	1	\N
49	49	49	1	T49	Dummy Standort 49	63	01	DummyFlurname49	DummyStrasse 49	1234	DummyOrt49	3	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	de	t	Dummy Standort 49 angelegt	\N	2024-11-22 00:00:00	2024-11-22 09:00:00.000000	alma	2024-11-22 09:00:00.000000	admin	1	\N
50	50	50	1	T50	Dummy Standort 50	63	01	DummyFlurname50	DummyStrasse 50	1234	DummyOrt50	4	01010000A0080800000000000052E343410000000047BF32410000000000E07A40	26030	A	\N	2010-01-01	f	f	f	12001	DepTypB	t	f	10017	A	10018	S1	58	01	80	01	55	BAV_110	10023	13	f	f	\N	\N	fr	t	Dummy Standort 50 angelegt	\N	2024-11-23 00:00:00	2024-11-23 09:00:00.000000	alma	2024-11-23 09:00:00.000000	admin	1	\N
\.


ALTER TABLE alma.vflz ENABLE TRIGGER ALL;

--
-- Data for Name: bere; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.bere DISABLE TRIGGER ALL;

COPY alma.bere (vflz_id, h_bere_res_abwbewe, c_bere_res_abwbewe, h_bere_prio_untersuch, c_bere_prio_untersuch, h_bere_prio_sanier, c_bere_prio_sanier, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	103	01	26020	\N	26021	\N	2024-07-17 07:40:16.088631	alma	\N	\N	t
2	103	01	26020	\N	26021	\N	2024-10-23 14:41:19.685452	\N	\N	\N	t
4	103	02	\N	\N	\N	\N	2024-11-21 14:32:12.439233	admin	2024-11-21 14:34:45.465971	admin	t
\.


ALTER TABLE alma.bere ENABLE TRIGGER ALL;

--
-- Data for Name: subj; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.subj DISABLE TRIGGER ALL;

COPY alma.subj (subj_id, name, vorname, taetigkeit, kuerzel, h_land, c_land, h_anrede, c_anrede, ident_nr, import_key, ort, postleitzahl, strasse, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
1	Sachdaten	Lesen		\N	14	\N	31	\N	\N	\N				2024-11-28 14:49:08.252502	\N	2025-04-23 09:48:11.040218	\N
2	Geschäfte	Lesen		\N	14	\N	31	\N	\N	\N				2024-11-28 14:49:17.802798	\N	2024-11-28 14:49:17.802798	\N
3	Sachdaten	Bearbeiten		\N	14	\N	31	\N	\N	\N				2024-12-04 14:15:27.217131	\N	2024-12-04 14:15:27.217131	\N
4	Geschäfte	Bearbeiten		\N	14	\N	31	\N	\N	\N				2024-12-04 14:15:27.217131	\N	2024-12-04 14:15:27.217131	\N
5	Admin	Super		\N	14	\N	31	\N	\N	\N				2024-12-04 14:15:27.217131	\N	2024-12-04 14:15:27.217131	\N
6	Bar	Foo		\N	14	\N	31	\N	\N	\N				2024-12-04 14:15:27.217131	\N	2024-12-04 14:15:27.217131	\N
7	Baz	Foo		\N	14	\N	31	\N	\N	\N				2024-12-04 14:15:27.217131	\N	2024-12-04 14:15:27.217131	\N
8	unauthorized	unauthorized		\N	\N	\N	\N	\N	\N	\N				\N	\N	\N	\N
9	lesen-sachdaten	lesen-sachdaten		\N	\N	\N	\N	\N	\N	\N				\N	\N	\N	\N
10	lesen-geschaefte	lesen-geschaefte		\N	\N	\N	\N	\N	\N	\N				\N	\N	\N	\N
11	bearbeiten-sachdaten	bearbeiten-sachdaten		\N	\N	\N	\N	\N	\N	\N				\N	\N	\N	\N
12	bearbeiten-geschaefte	bearbeiten-geschaefte		\N	\N	\N	\N	\N	\N	\N				\N	\N	\N	\N
13	admin	admin		\N	\N	\N	\N	\N	\N	\N				\N	\N	\N	\N
\.


ALTER TABLE alma.subj ENABLE TRIGGER ALL;

--
-- Data for Name: bet; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.bet DISABLE TRIGGER ALL;

COPY alma.bet (bet_id, vflz_id, subj_id, is_eigentuemer, is_sachbearbeiter, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
2	1	3	f	f	2024-12-04 14:15:44.596078	\N	2024-12-04 14:15:44.596078	\N	t
1	1	1	t	t	2025-05-07 13:11:03.891987	bearbeiten-geschaefte	2025-05-07 13:11:03.89527	bearbeiten-geschaefte	t
\.


ALTER TABLE alma.bet ENABLE TRIGGER ALL;

--
-- Data for Name: grun; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.grun DISABLE TRIGGER ALL;

COPY alma.grun (grun_id, h_gem_id, h_nb_id, gb_nummer, egrid, h_grun_status, c_grun_status, wkb_geometry, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
3	2	\N	3	\N	26000	1	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	2024-11-28 15:23:42.965068	\N	2024-11-28 15:23:42.965068	\N
1	1	1	1	\N	26000	1	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	2024-11-28 15:17:40.206436	\N	2024-11-28 15:17:40.206436	\N
2	1	1	2	\N	26000	1	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	2024-11-28 15:23:42.965068	\N	2024-11-28 15:23:42.965068	\N
4	1	1	4	\N	26000	0	0106000020080800000100000001030000000100000005000000000000009DE343410000000015BF3241000000009DE343410000000079BF324100000000CFE343410000000079BF324100000000CFE343410000000015BF3241000000009DE343410000000015BF3241	2024-11-28 15:17:40.206436	\N	2024-11-28 15:17:40.206436	\N
\.


ALTER TABLE alma.grun ENABLE TRIGGER ALL;

--
-- Data for Name: bet_art; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.bet_art DISABLE TRIGGER ALL;

COPY alma.bet_art (bet_art_id, bet_id, grun_id, h_bez_art, c_bez_art, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
2	2	\N	2201	1	2024-12-04 14:16:00.12417	\N	2024-12-04 14:16:00.12417	\N	t
1	1	\N	2202	sachbearbeitung	2025-05-07 13:11:03.893734	bearbeiten-geschaefte	\N	\N	t
3	1	1	2200	eigentum	2025-05-12 11:15:07.757894	\N	2025-05-12 11:15:07.757894	\N	t
4	1	4	2200	eigentum	2025-05-12 11:15:07.757894	\N	2025-05-12 11:15:07.757894	\N	t
\.


ALTER TABLE alma.bet_art ENABLE TRIGGER ALL;

--
-- Data for Name: wf_config; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.wf_config DISABLE TRIGGER ALL;

COPY alma.wf_config (wf_config_id, key, workflow_id, title, type, version, time_period, name, start_task_id, min_per_entity, max_per_entity, triggers, is_start_task, fields, is_optional) FROM stdin;
\.


ALTER TABLE alma.wf_config ENABLE TRIGGER ALL;

--
-- Data for Name: wf_node; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.wf_node DISABLE TRIGGER ALL;

COPY alma.wf_node (wf_node_id, title, type, wf_config_id, version, parent_id, next_node_id, is_moveable, status, started_at, finished_at, deadline, entity_id, data, note, form_config, form_data, document_ref, is_public, created_at, created_by, updated_at, updated_by, events_triggered) FROM stdin;
1	Test Task	task	\N	\N	2	\N	f	started	2025-03-21	\N	2025-03-28 10:59:44.642	1	{}	\N	\N	\N	\N	f	2025-03-21 17:14:23.019	\N	\N	\N	f
2	Test Workflow	workflow	\N	\N	\N	\N	f	started	2025-03-19	\N	2025-03-29 10:59:44.642	1	{}	\N	\N	\N	\N	f	2025-03-25 10:59:44.642497	\N	\N	\N	f
5	Test Note	note	\N	\N	\N	\N	f	started	2025-03-24	\N	\N	1	{}	\N	\N	\N	\N	t	2025-03-25 11:01:03.297556	\N	\N	\N	f
4	Test Document	document	\N	\N	\N	\N	f	started	2025-03-18	\N	\N	1	{}	\N	\N	\N	""	t	2025-03-25 11:01:03.296338	\N	\N	\N	f
3	Test Form	form	\N	\N	2	\N	f	started	2025-03-25	\N	\N	1	{}	\N	{"name": "form_1", "fields": [{"name": "test_a", "type": "bool","label": "Test A"}, {"name": "test_b", "type": "bool", "label": "Test B"}]}	{}	\N	t	2025-03-25 11:01:03.294087	\N	\N	\N	f
\.


ALTER TABLE alma.wf_node ENABLE TRIGGER ALL;

--
-- Data for Name: bet_task; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.bet_task DISABLE TRIGGER ALL;

COPY alma.bet_task (bet_task_id, subj_id, wf_node_id, vfl_id, h_bez_art, c_bez_art, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
\.


ALTER TABLE alma.bet_task ENABLE TRIGGER ALL;

--
-- Data for Name: cod; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.cod DISABLE TRIGGER ALL;

COPY alma.cod (c_cli_id, code, sort_key, bemerkungen, c_status, c_is_null_code, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
26030	A	\N	\N	t	f	\N	\N	\N	\N
26030	B	\N	\N	t	f	\N	\N	\N	\N
2201	1	\N	\N	t	f	\N	\N	\N	\N
2201	2	\N	\N	t	f	\N	\N	\N	\N
\.


ALTER TABLE alma.cod ENABLE TRIGGER ALL;

--
-- Data for Name: cod_bezart; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.cod_bezart DISABLE TRIGGER ALL;

COPY alma.cod_bezart (cod_bezart_id, is_eigentuemer, h_bez_art, c_bez_art) FROM stdin;
\.


ALTER TABLE alma.cod_bezart ENABLE TRIGGER ALL;

--
-- Data for Name: cod_kbsinfo; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.cod_kbsinfo DISABLE TRIGGER ALL;

COPY alma.cod_kbsinfo (cod_kbsinfo_id, h_bere_res_abwbewe, c_bere_res_abwbewe, c_bewe_gruppe, color, color_rgb, belastet, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
5	103	00	sonstige	#aff0f0	175 240 240	f	2025-02-04 13:45:40.326131	\N	\N	\N
6	103	03	04	#0066ff	0 102 255	t	2025-02-04 13:46:58.557554	\N	\N	\N
2	103	02	03	#ffc000	255 255 0	t	2024-11-05 12:16:12.237932	\N	\N	\N
7	103	BAV60	02	#5f5f5f	95 95 95	t	2025-02-04 13:47:34.306078	\N	\N	\N
8	103	BAV81	04	#ff0000	255 0 0	t	2025-02-04 13:48:54.737181	\N	\N	\N
9	103	BAV92	02	#00ffff	0 255 255	f	2025-02-04 13:48:54.740267	\N	\N	\N
3	103	BAV70	03	#FFFF00	255 102 0	t	2024-11-05 12:16:51.392069	\N	\N	\N
10	103	BAV93	02	#e020c5	224 32 197	f	2025-02-04 13:50:20.175704	\N	\N	\N
11	103	BAV94	02	#e020c5	224 32 197	f	2025-02-04 13:50:20.178888	\N	\N	\N
4	103	BAV91	02	#7030a0	112 48 160	f	2024-11-05 12:17:23.115405	\N	\N	\N
12	103	BAV71	04	#ff6600	255 102 0	t	2025-02-04 13:51:14.337573	\N	\N	\N
1	103	01	01	#00FF00	102 255 117	f	2024-07-17 07:39:10.894165	alma	\N	\N
\.


ALTER TABLE alma.cod_kbsinfo ENABLE TRIGGER ALL;

--
-- Data for Name: event; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.event DISABLE TRIGGER ALL;

COPY alma.event (event_id, event_type, event_data, event_timestamp, vflz_id, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
\.


ALTER TABLE alma.event ENABLE TRIGGER ALL;

--
-- Data for Name: grun_subj; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.grun_subj DISABLE TRIGGER ALL;

COPY alma.grun_subj (grun_subj_id, grun_id, subj_id, h_eigentums_art, c_eigentums_art, c_status, bemerkungen, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
\.


ALTER TABLE alma.grun_subj ENABLE TRIGGER ALL;

--
-- Data for Name: gwas; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.gwas DISABLE TRIGGER ALL;

COPY alma.gwas (gwas_id, vflz_id, h_gwas_relzugw, c_gwas_relzugw, gwas_flurabstand, h_gwas_nutzung, c_gwas_nutzung, gwas_distanz, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	71	01	10	88	01	10	2024-10-15 07:03:40.429712	bearbeiten-sachdaten	2024-10-15 07:17:03.813678	admin	t
\.


ALTER TABLE alma.gwas ENABLE TRIGGER ALL;

--
-- Data for Name: gwnu; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.gwnu DISABLE TRIGGER ALL;

COPY alma.gwnu (gwnu_id, vflz_id, h_gwnu_nutzung, c_gwnu_nutzung, gwnu_distanz, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
2	1	88	01	10	2024-10-15 07:03:40.429712	bearbeiten-sachdaten	2024-10-15 07:17:03.813678	admin	t
\.


ALTER TABLE alma.gwnu ENABLE TRIGGER ALL;

--
-- Data for Name: gwvk; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.gwvk DISABLE TRIGGER ALL;

COPY alma.gwvk (gwvk_id, vflz_id, h_gwvk_relzugw, c_gwvk_relzugw, gwvk_flurabstand, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
2	1	71	01	10	2024-10-15 07:03:40.433028	bearbeiten-sachdaten	2024-10-15 07:17:03.819015	admin	t
\.


ALTER TABLE alma.gwvk ENABLE TRIGGER ALL;

--
-- Data for Name: h_gem; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.h_gem DISABLE TRIGGER ALL;

COPY alma.h_gem (h_gem_id, bfs_nummer, gemeinde, wkb_geometry, h_kanton, c_kanton, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
5	5	Hedingen	\N	15	ZH	2024-11-15 13:24:16.926253	\N	2024-11-15 13:24:16.926253	\N
6	6	Kappel am Albis	\N	15	ZH	2024-11-15 13:24:16.93042	\N	2024-11-15 13:24:16.93042	\N
7	7	Knonau	\N	15	ZH	2024-11-15 13:24:16.931697	\N	2024-11-15 13:24:16.931697	\N
8	8	Maschwanden	\N	15	ZH	2024-11-15 13:24:16.932482	\N	2024-11-15 13:24:16.932482	\N
114	114	Fischenthal	\N	15	ZH	2024-11-15 13:27:13.119995	\N	2024-11-15 13:27:13.119995	\N
136	136	Langnau am Albis	\N	15	ZH	2024-11-15 13:27:13.121973	\N	2024-11-15 13:27:13.121973	\N
329	329	Langenthal	\N	15	BE	2024-11-15 13:27:13.122797	\N	2024-11-15 13:27:13.122797	\N
3	3	Baz	\N	15	BS	\N	alma	\N	\N
4	4	Goo	\N	15	GR	2024-09-17 07:36:40.123016	\N	2024-09-17 07:36:40.123016	\N
2	2	Bar	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	15	BL	\N	alma	\N	\N
1	1	Foo	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	15	ZH	\N	alma	\N	\N
\.


ALTER TABLE alma.h_gem ENABLE TRIGGER ALL;

--
-- Data for Name: h_nb; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.h_nb DISABLE TRIGGER ALL;

COPY alma.h_nb (h_nb_id, bezeichnung, wkb_geometry, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
1	Test A	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	2024-12-03 08:03:26.261821	\N	2024-12-03 08:03:26.261821	\N
2	Test B	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	2026-01-23 09:26:31.070707	\N	2026-01-23 09:26:31.070707	\N
\.


ALTER TABLE alma.h_nb ENABLE TRIGGER ALL;

--
-- Data for Name: h_ort; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.h_ort DISABLE TRIGGER ALL;

COPY alma.h_ort (h_ort_id, h_gem_id, ortsname, postleitzahl, erfassungs_datum, erfasser, mutations_datum, mutierer, wkb_geometry, lang) FROM stdin;
\.


ALTER TABLE alma.h_ort ENABLE TRIGGER ALL;

--
-- Data for Name: inta; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.inta DISABLE TRIGGER ALL;

COPY alma.inta (inta_id, vflz_id, inta_vol_kompartiment, inta_ablag_von, inta_ablag_bis, zeitraum_bisheute, zeitraum_bisjahr, zeitraum_vonjahr, inta_tiefe, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	101	1980-08-01	2010-02-01	f	f	f	102	2024-07-05 10:33:09.816013	alma	2024-10-15 07:17:03.803782	admin	t
\.


ALTER TABLE alma.inta ENABLE TRIGGER ALL;

--
-- Data for Name: intb; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intb DISABLE TRIGGER ALL;

COPY alma.intb (intb_id, vflz_id, intb_typ, intb_firma_name, intb_firma_strasse, intb_firma_plz, intb_firma_ort, intb_groesse, h_intb_bran, c_intb_bran, intb_vonbetrieb, intb_bisbetrieb, zeitraum_bisheute, zeitraum_bisjahr, zeitraum_vonjahr, relevant, intb_schiessanlage_schusszahl, intb_schiessanlage_scheibenzahl, intb_schiessanlage_hat_kugelfang, h_intb_schiessanlage_typ, c_intb_schiessanlage_typ, h_intb_infg_vonbetrieb, c_intb_infg_vonbetrieb, h_intb_infg_bisbetrieb, c_intb_infg_bisbetrieb, intb_mobile_stoffe, h_intb_res_abwbewe, c_intb_res_abwbewe, zentroid, intb_eva, h_intb_unterstand, c_intb_unterstand, h_gem_id, h_intb_bran_noga, c_intb_bran_noga, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	2	02	TestFirma	TestStrasse 123	1234	TestOrt	1	25	010	2010-01-01	2013-12-11	f	f	t	f	\N	\N	\N	11410	\N	90	02	90	01	f	103	01	0101000020080800000000008052E343410000000048BF3241	1234	10023	01	\N	25001	A2	2024-07-10 08:01:09.430766	alma	2024-11-26 13:40:09.820017	admin	t
2	4	04	SchiessanlageName	SchiessanlageStrasse	1234	SchiessanlageOrt	3	25	9143	2012-01-01	2014-12-11	f	f	f	t	23	12	t	11410	01	90	01	90	03	t	103	01	0101000020080800000000008052E343410000000048BF3241	123	10023	01	\N	25001	\N	2024-09-17 09:01:11.901863	\N	2024-11-26 13:40:09.957005	admin	t
\.


ALTER TABLE alma.intb ENABLE TRIGGER ALL;

--
-- Data for Name: intk; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intk DISABLE TRIGGER ALL;

COPY alma.intk (intk_id, vflz_id, name, eva_nummer, strasse, plz, ort, von, bis, zeitraum_bisheute, zeitraum_bisjahr, zeitraum_vonjahr, h_infg_von, c_infg_von, h_infg_bis, c_infg_bis, h_kinderspielplatz_gruenflache_typ, c_kinderspielplatz_gruenflache_typ, h_eigentumsform, c_eigentumsform, belastung_ueber_sanierungswert, relevant, h_untersuchungsstand, c_untersuchungsstand, h_beurteilung, c_beurteilung, zentroid, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	5	TestSpielplatz	1234	TestStrasse 123	1234	TestOrt	2010-01-01	2013-12-11	f	f	t	90	02	90	01	\N	\N	\N	\N	t	t	10023	05	103	BAV81	0101000020080800000000008052E343410000000048BF3241	2025-09-16 14:36:57.269027	admin	2025-10-22 12:08:47.113551	admin	t
\.


ALTER TABLE alma.intk ENABLE TRIGGER ALL;

--
-- Data for Name: intk_altersstufe; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intk_altersstufe DISABLE TRIGGER ALL;

COPY alma.intk_altersstufe (intk_altersstufe_id, intk_id, h_altersstufe_kinder, c_altersstufe_kinder) FROM stdin;
1	1	402	01
\.


ALTER TABLE alma.intk_altersstufe ENABLE TRIGGER ALL;

--
-- Data for Name: intp; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intp DISABLE TRIGGER ALL;

COPY alma.intp (intp_id, vflz_id, name, strasse, plz, ort, eva_nummer, von, bis, zeitraum_bisheute, zeitraum_bisjahr, zeitraum_vonjahr, h_infg_von, c_infg_von, h_infg_bis, c_infg_bis, h_pfas_typ, c_pfas_typ, pfas_loeschmittel, menge_schaumgemisch, menge_konzentrat, beschreibungen_detail, relevant, h_untersuchungsstand, c_untersuchungsstand, h_beurteilung, c_beurteilung, h_branche, c_branche, zentroid, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	6	TestPFAS	TestStrasse 123	1234	TestOrt	1234	2023-10-01	2024-10-01	f	f	f	90	01	90	01	500	magazin	f	1	2	Test Beschreibung Detail PFAS	t	10023	05	103	BAV81	25002	9133	0101000020080800000000008052E343410000000048BF3241	2025-10-22 12:08:33.902164	admin	2025-10-22 13:35:10.912056	admin	t
\.


ALTER TABLE alma.intp ENABLE TRIGGER ALL;

--
-- Data for Name: intp_loeschschaum_einsatz; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intp_loeschschaum_einsatz DISABLE TRIGGER ALL;

COPY alma.intp_loeschschaum_einsatz (intp_loeschschaum_einsatz_id, intp_id, h_loeschschaum_einsatz, c_loeschschaum_einsatz, h_haeufigkeit_nutzung, c_haeufigkeit_nutzung, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	503	hand	504	nie	2025-10-22 13:35:10.906582	admin	\N	\N	t
\.


ALTER TABLE alma.intp_loeschschaum_einsatz ENABLE TRIGGER ALL;

--
-- Data for Name: intp_pfas_freie_loeschmittel; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intp_pfas_freie_loeschmittel DISABLE TRIGGER ALL;

COPY alma.intp_pfas_freie_loeschmittel (intp_pfas_freie_loeschmittel_id, intp_id, h_loeschmittel_pfas_frei, c_loeschmittel_pfas_frei) FROM stdin;
1	1	502	mbs
2	1	502	p
\.


ALTER TABLE alma.intp_pfas_freie_loeschmittel ENABLE TRIGGER ALL;

--
-- Data for Name: intp_pfas_haltige_loeschmittel; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intp_pfas_haltige_loeschmittel DISABLE TRIGGER ALL;

COPY alma.intp_pfas_haltige_loeschmittel (intp_pfas_haltige_loeschmittel_id, intp_id, h_loeschmittel_pfas_haltig, c_loeschmittel_pfas_haltig) FROM stdin;
1	1	501	afff
2	1	501	fffp
\.


ALTER TABLE alma.intp_pfas_haltige_loeschmittel ENABLE TRIGGER ALL;

--
-- Data for Name: intu; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.intu DISABLE TRIGGER ALL;

COPY alma.intu (intu_id, vflz_id, intu_name, intu_unfallvon, zeitraum_jahr, h_intu_infg_unfallvon, c_intu_infg_unfallvon, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	3	UnfallTest	2020-02-02	f	90	01	2024-09-17 07:47:21.669662	\N	2024-10-15 07:03:50.424555	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.intu ENABLE TRIGGER ALL;

--
-- Data for Name: inum; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.inum DISABLE TRIGGER ALL;

COPY alma.inum (inum_id, intu_id, inum_stoffmng, inum_ausgelaufen, inum_zurueckgewonnen, h_inum_stoffe, c_inum_stoffe, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	10	30	20	117	111	2024-09-17 07:49:52.039307	\N	2024-10-15 07:03:50.422663	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.inum ENABLE TRIGGER ALL;

--
-- Data for Name: kksk; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.kksk DISABLE TRIGGER ALL;

COPY alma.kksk (kksk_id, inta_id, kksk_teilvol, h_kksk_stoffkl, c_kksk_stoffkl, h_kksk_infg_ablag_von, c_kksk_infg_ablag_von, h_kksk_infg_ablag_bis, c_kksk_infg_ablag_bis, kksk_ablag_von, kksk_ablag_bis, zeitraum_bisheute, zeitraum_bisjahr, zeitraum_vonjahr, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	201	94	02	90	02	90	01	1980-08-01	2010-02-01	f	f	f	2024-07-05 10:34:27.278725	alma	2024-10-15 07:03:37.722776	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.kksk ENABLE TRIGGER ALL;

--
-- Data for Name: kksg; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.kksg DISABLE TRIGGER ALL;

COPY alma.kksg (kksg_id, kksk_id, kksg_teilvol, h_kksg_stoffgrp, c_kksg_stoffgrp, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	301	115	01	2024-07-05 10:34:38.365708	alma	2024-10-15 07:03:37.720714	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.kksg ENABLE TRIGGER ALL;

--
-- Data for Name: kontakt; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.kontakt DISABLE TRIGGER ALL;

COPY alma.kontakt (kontakt_id, kontakt, h_kontakt_typ, c_kontakt_typ, subj_id, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
\.


ALTER TABLE alma.kontakt ENABLE TRIGGER ALL;

--
-- Data for Name: mass; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.mass DISABLE TRIGGER ALL;

COPY alma.mass (mass_id, vflz_id, h_massnahme, c_massnahme, dat_massnahme, ang_massnahme, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
2	1	\N	\N	\N	\N	2024-10-17 13:19:57.640368	admin	\N	\N	t
\.


ALTER TABLE alma.mass ENABLE TRIGGER ALL;

--
-- Data for Name: nubo; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.nubo DISABLE TRIGGER ALL;

COPY alma.nubo (nubo_id, vflz_id, h_nubo_nutzungsart, c_nubo_nutzungsart, h_nubo_akt_nutzung, c_nubo_akt_nutzung, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	87	01	104	01	2024-09-20 10:53:38.245752	\N	2024-10-15 07:03:37.735031	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.nubo ENABLE TRIGGER ALL;

--
-- Data for Name: ogw; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.ogw DISABLE TRIGGER ALL;

COPY alma.ogw (ogw_id, vflz_id, ogw_name, ogw_distanz, h_ogw_art_gewaesser, c_ogw_art_gewaesser, h_ogw_bau_gewaesser, c_ogw_bau_gewaesser, h_ogw_rellage, c_ogw_rellage, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	TestName	10	66	05	67	04	70	04	2024-10-15 07:03:40.431356	bearbeiten-sachdaten	2024-10-15 07:17:03.817045	admin	t
\.


ALTER TABLE alma.ogw ENABLE TRIGGER ALL;

--
-- Data for Name: pool; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.pool DISABLE TRIGGER ALL;

COPY alma.pool (pool_id, bezeichnung, bemerkungen, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
1	Alle Standorte	Pool mit allen Standorten (E2E)	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
2	Pool Nord	E2E Test Pool Nord	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
3	Pool Sued	E2E Test Pool Sued	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
4	Pool Ost	E2E Test Pool Ost	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
5	Pool West	E2E Test Pool West	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
\.


ALTER TABLE alma.pool ENABLE TRIGGER ALL;

--
-- Data for Name: sani; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.sani DISABLE TRIGGER ALL;

COPY alma.sani (sani_id, vflz_id, h_saniziel, c_saniziel, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
2	1	\N	\N	2024-10-17 13:19:57.648027	admin	\N	\N	t
\.


ALTER TABLE alma.sani ENABLE TRIGGER ALL;

--
-- Data for Name: stoffe; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.stoffe DISABLE TRIGGER ALL;

COPY alma.stoffe (stoffe_id, vflz_id, h_stoffe_umweltbereich, c_stoffe_umweltbereich, h_stoffe_gruppe, c_stoffe_gruppe, h_stoffe_stoff, c_stoffe_stoff, h_stoffe_beurteilung, c_stoffe_beurteilung, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	299	01	300	01	301	01	330	01	2024-09-20 10:54:44.456478	\N	2024-10-15 07:03:37.738647	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.stoffe ENABLE TRIGGER ALL;

--
-- Data for Name: subj_category; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.subj_category DISABLE TRIGGER ALL;

COPY alma.subj_category (subj_category_id, subj_id, h_subj_category, c_subj_category, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
1	1	10019	bearb	2025-04-22 07:49:08.995129	\N	2025-04-22 07:49:08.995129	\N
\.


ALTER TABLE alma.subj_category ENABLE TRIGGER ALL;

--
-- Data for Name: task_category; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.task_category DISABLE TRIGGER ALL;

COPY alma.task_category (task_category_id, wf_node_id, h_category, c_category) FROM stdin;
1	1	\N	\N
2	2	\N	\N
3	3	10022	1
4	4	10022	1
5	5	10022	1
\.


ALTER TABLE alma.task_category ENABLE TRIGGER ALL;

--
-- Data for Name: translations; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.translations DISABLE TRIGGER ALL;

COPY alma.translations (msgid, msgstr, locale, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
code:2201:1	Foo	de	\N	\N	\N	\N
code:2201:2	Bar	de	\N	\N	\N	\N
code:26030:A	A Behörde	de	\N	\N	\N	\N
code:26030:B	Bar Behörde	de	\N	\N	\N	\N
\.

ALTER TABLE alma.translations ENABLE TRIGGER ALL;

--
-- Data for Name: veen; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.veen DISABLE TRIGGER ALL;

COPY alma.veen (veen_id, vflz_id, h_veen_natuerlich, c_veen_natuerlich, veen_datum, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	61	01	2020-02-03	2024-09-20 10:56:35.342827	\N	2024-10-15 07:03:37.741044	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.veen ENABLE TRIGGER ALL;

--
-- Data for Name: vfl_pool; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.vfl_pool DISABLE TRIGGER ALL;

COPY alma.vfl_pool (vfl_pool_id, pool_id, vfl_id, erfassungs_datum, erfasser, mutations_datum, mutierer) FROM stdin;
1	1	1	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
2	1	2	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
3	1	3	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
4	1	4	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
5	1	5	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
6	1	6	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
7	1	7	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
8	1	8	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
9	1	9	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
10	1	10	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
11	1	11	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
12	1	12	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
13	1	13	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
14	1	14	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
15	1	15	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
16	1	16	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
17	1	17	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
18	1	18	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
19	1	19	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
20	1	20	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
21	1	21	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
22	1	22	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
23	1	23	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
24	1	24	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
25	1	25	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
26	1	26	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
27	1	27	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
28	1	28	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
29	1	29	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
30	1	30	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
31	1	31	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
32	1	32	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
33	1	33	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
34	1	34	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
35	1	35	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
36	1	36	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
37	1	37	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
38	1	38	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
39	1	39	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
40	1	40	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
41	1	41	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
42	1	42	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
43	1	43	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
44	1	44	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
45	1	45	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
46	1	46	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
47	1	47	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
48	1	48	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
49	1	49	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
50	1	50	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
51	2	1	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
52	2	2	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
53	2	3	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
54	2	4	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
55	2	5	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
56	2	6	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
57	2	7	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
58	2	8	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
59	2	9	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
60	2	10	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
61	3	11	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
62	3	12	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
63	3	13	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
64	3	14	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
65	3	15	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
66	3	16	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
67	3	17	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
68	3	18	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
69	3	19	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
70	3	20	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
71	4	21	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
72	4	22	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
73	4	23	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
74	4	24	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
75	4	25	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
76	4	26	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
77	4	27	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
78	4	28	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
79	4	29	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
80	4	30	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
81	5	31	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
82	5	32	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
83	5	33	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
84	5	34	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
85	5	35	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
86	5	36	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
87	5	37	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
88	5	38	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
89	5	39	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
90	5	40	2024-11-15 09:00:00.000000	alma	2024-11-15 09:00:00.000000	\N
\.


ALTER TABLE alma.vfl_pool ENABLE TRIGGER ALL;

--
-- Data for Name: vflgeo; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.vflgeo DISABLE TRIGGER ALL;

COPY alma.vflgeo (vflgeo_id, vflz_id, wkb_geometry, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	2024-10-23 14:41:00.067606	\N	2024-10-23 14:41:00.067606	\N	t
2	2	0101000020080800000000008052E343410000000048BF3241	2024-10-23 14:41:00.067606	\N	2024-10-23 14:41:00.067606	\N	t
\.


ALTER TABLE alma.vflgeo ENABLE TRIGGER ALL;

--
-- Data for Name: vflnr; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.vflnr DISABLE TRIGGER ALL;

COPY alma.vflnr (vflnr_id, vflz_id, h_org_kuerzel, c_org_kuerzel, aktiv, nummer, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	26030	A	t	1	2025-03-05 11:25:29.124922	admin	\N	\N	t
\.


ALTER TABLE alma.vflnr ENABLE TRIGGER ALL;

--
-- Data for Name: vfus; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.vfus DISABLE TRIGGER ALL;

COPY alma.vfus (vfus_id, vflz_id, h_vfus_art_schaden, c_vfus_art_schaden, h_vfus_schaeden, c_vfus_schaeden, erfassungs_datum, erfasser, mutations_datum, mutierer, is_current) FROM stdin;
1	1	101	02	102	BAVUSW01	2024-09-20 11:04:26.103833	\N	2024-10-15 07:03:37.744166	bearbeiten-sachdaten	t
\.


ALTER TABLE alma.vfus ENABLE TRIGGER ALL;

--
-- Data for Name: wf_link; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.wf_link DISABLE TRIGGER ALL;

COPY alma.wf_link (task_id, target_task_id, link_no, condition) FROM stdin;
\.


ALTER TABLE alma.wf_link ENABLE TRIGGER ALL;

--
-- Data for Name: wf_node_event; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.wf_node_event DISABLE TRIGGER ALL;

COPY alma.wf_node_event (wf_node_id, event_id) FROM stdin;
\.


ALTER TABLE alma.wf_node_event ENABLE TRIGGER ALL;

--
-- Data for Name: wf_step; Type: TABLE DATA; Schema: alma; Owner: alma
--

ALTER TABLE alma.wf_step DISABLE TRIGGER ALL;

COPY alma.wf_step (task_id, step_id, step_no, condition) FROM stdin;
\.


ALTER TABLE alma.wf_step ENABLE TRIGGER ALL;

--
-- Data for Name: report_export_offset; Type: TABLE DATA; Schema: alma_external; Owner: alma
--

ALTER TABLE alma_external.report_export_offset DISABLE TRIGGER ALL;

COPY alma_external.report_export_offset (report_export_offset_id, report_id, last_vflz_id) FROM stdin;
\.


ALTER TABLE alma_external.report_export_offset ENABLE TRIGGER ALL;

--
-- Data for Name: wfs_cache; Type: TABLE DATA; Schema: alma_external; Owner: alma
--

ALTER TABLE alma_external.wfs_cache DISABLE TRIGGER ALL;

COPY alma_external.wfs_cache (wfs_cache_id, wkb_geometry, postleitzahl, ort, h_gem_id, gemeinde_name, bfs_nummer, h_nb_id, egrid, gb_nummer, gws_zone, gws_bereich, wfs_service_name, created_at) FROM stdin;
1	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	0123	\N	\N	\N	\N	\N	\N	\N	\N	\N	postleitzahl_test	2024-11-26 08:54:54.310942
2	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	\N	ValidatedOrt	\N	\N	\N	\N	\N	\N	\N	\N	ort_test	2024-11-26 12:15:41.036963
3	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	\N	\N	2	Bar	\N	\N	\N	\N	\N	\N	gemeinde_test	2024-11-26 12:20:31.508249
4	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	\N	\N	\N	\N	\N	\N	\N	\N	\N	code:10017:B	gws_bereich_test	2024-12-03 14:18:39.672297
5	01060000200808000001000000010300000001000000050000000000000039E343410000000015BF32410000000039E343410000000079BF3241000000006BE343410000000079BF3241000000006BE343410000000015BF32410000000039E343410000000015BF3241	\N	\N	\N	\N	\N	\N	\N	\N	code:10018:S2	\N	gws_zone_test	2024-12-04 09:25:46.211406
\.


ALTER TABLE alma_external.wfs_cache ENABLE TRIGGER ALL;

--
-- Data for Name: wfs_update; Type: TABLE DATA; Schema: alma_external; Owner: alma
--

ALTER TABLE alma_external.wfs_update DISABLE TRIGGER ALL;

COPY alma_external.wfs_update (vflz_id, last_update) FROM stdin;
\.
ALTER TABLE alma_external.wfs_update ENABLE TRIGGER ALL;

--
-- Name: bem_bem_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.bem_bem_id_seq', 35, true);


--
-- Name: bemgrp_bemgrp_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.bemgrp_bemgrp_id_seq', 17, true);


--
-- Name: bet_art_bet_art_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.bet_art_bet_art_id_seq', 4, true);


--
-- Name: bet_bet_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.bet_bet_id_seq', 2, true);


--
-- Name: bet_task_bet_task_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.bet_task_bet_task_id_seq', 1, false);


--
-- Name: cod_bezart_cod_bezart_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.cod_bezart_cod_bezart_id_seq', 1, false);


--
-- Name: cod_kbsinfo_cod_kbsinfo_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.cod_kbsinfo_cod_kbsinfo_id_seq', 4, true);


--
-- Name: event_event_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.event_event_id_seq', 1, false);


--
-- Name: flugplatz_flugplatz_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.flugplatz_flugplatz_id_seq', 1, false);


--
-- Name: grun_grun_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.grun_grun_id_seq', 4, true);


--
-- Name: grun_subj_grun_subj_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.grun_subj_grun_subj_id_seq', 1, false);


--
-- Name: gwas_gwas_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.gwas_gwas_id_seq', 1, true);


--
-- Name: gwnu_gwnu_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.gwnu_gwnu_id_seq', 9, true);


--
-- Name: gwvk_gwvk_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.gwvk_gwvk_id_seq', 14, true);


--
-- Name: inta_inta_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.inta_inta_id_seq', 2, true);


--
-- Name: intb_intb_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intb_intb_id_seq', 4, true);


--
-- Name: intk_altersstufe_intk_altersstufe_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intk_altersstufe_intk_altersstufe_id_seq', 1, true);


--
-- Name: intk_intk_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intk_intk_id_seq', 1, true);


--
-- Name: intp_intp_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intp_intp_id_seq', 1, true);


--
-- Name: intp_loeschschaum_einsatz_intp_loeschschaum_einsatz_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intp_loeschschaum_einsatz_intp_loeschschaum_einsatz_id_seq', 1, true);


--
-- Name: intp_pfas_freie_loeschmittel_intp_pfas_freie_loeschmittel_i_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intp_pfas_freie_loeschmittel_intp_pfas_freie_loeschmittel_i_seq', 2, true);


--
-- Name: intp_pfas_haltige_loeschmitte_intp_pfas_haltige_loeschmitte_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intp_pfas_haltige_loeschmitte_intp_pfas_haltige_loeschmitte_seq', 2, true);


--
-- Name: intu_intu_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.intu_intu_id_seq', 2, true);


--
-- Name: inum_inum_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.inum_inum_id_seq', 2, true);


--
-- Name: kksg_kksg_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.kksg_kksg_id_seq', 2, true);


--
-- Name: kksk_kksk_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.kksk_kksk_id_seq', 2, true);


--
-- Name: kontakt_kontakt_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.kontakt_kontakt_id_seq', 1, false);


--
-- Name: ktu_ktu_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.ktu_ktu_id_seq', 1, false);


--
-- Name: mass_mass_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.mass_mass_id_seq', 2, true);


--
-- Name: nubo_nubo_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.nubo_nubo_id_seq', 3, true);


--
-- Name: obje_obje_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.obje_obje_id_seq', 50, true);


--
-- Name: ogw_ogw_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.ogw_ogw_id_seq', 1, true);


--
-- Name: pool_pool_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.pool_pool_id_seq', 5, true);


--
-- Name: sani_sani_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.sani_sani_id_seq', 2, true);


--
-- Name: stoffe_stoffe_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.stoffe_stoffe_id_seq', 3, true);


--
-- Name: subj_category_subj_category_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.subj_category_subj_category_id_seq', 2, true);


--
-- Name: subj_subj_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.subj_subj_id_seq', 13, true);


--
-- Name: task_category_task_category_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.task_category_task_category_id_seq', 1, false);


--
-- Name: veen_veen_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.veen_veen_id_seq', 3, true);


--
-- Name: vfl_pool_vfl_pool_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.vfl_pool_vfl_pool_id_seq', 90, true);


--
-- Name: vflgeo_vflgeo_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.vflgeo_vflgeo_id_seq', 3, true);


--
-- Name: vflnr_vflnr_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.vflnr_vflnr_id_seq', 3, true);


--
-- Name: vflz_vflz_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.vflz_vflz_id_seq', 50, true);


--
-- Name: vfus_vfus_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.vfus_vfus_id_seq', 3, true);


--
-- Name: wf_config_wf_config_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.wf_config_wf_config_id_seq', 1, false);


--
-- Name: wf_node_wf_node_id_seq; Type: SEQUENCE SET; Schema: alma; Owner: alma
--

SELECT pg_catalog.setval('alma.wf_node_wf_node_id_seq', 6, true);


--
-- Name: report_export_offset_report_export_offset_id_seq; Type: SEQUENCE SET; Schema: alma_external; Owner: alma
--

SELECT pg_catalog.setval('alma_external.report_export_offset_report_export_offset_id_seq', 1, false);


--
-- Name: wfs_cache_wfs_cache_id_seq; Type: SEQUENCE SET; Schema: alma_external; Owner: alma
--

SELECT pg_catalog.setval('alma_external.wfs_cache_wfs_cache_id_seq', 5, true);


--
-- PostgreSQL database dump complete
--

