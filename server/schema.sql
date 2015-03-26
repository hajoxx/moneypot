

CREATE TABLE blocks (
    height integer NOT NULL,
    hash text NOT NULL
);


--
-- TOC entry 171 (class 1259 OID 87688)
-- Name: fundings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE fundings (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    amount bigint NOT NULL,
    bitcoin_withdrawal_txid text,
    bitcoin_withdrawal_address text,
    created timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    bitcoin_deposit_txid text,
    withdrawal_id UUID,
    CONSTRAINT fundings_withdrawal_id_key UNIQUE (withdrawal_id)
);


--
-- TOC entry 172 (class 1259 OID 87695)
-- Name: fundings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE fundings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 2899 (class 0 OID 0)
-- Dependencies: 172
-- Name: fundings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE fundings_id_seq OWNED BY fundings.id;


--
-- TOC entry 173 (class 1259 OID 87697)
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE games (
    id bigint NOT NULL,
    game_crash bigint NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    ended boolean DEFAULT false NOT NULL
);


--
-- TOC entry 174 (class 1259 OID 87705)
-- Name: games_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE games_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 2900 (class 0 OID 0)
-- Dependencies: 174
-- Name: games_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE games_id_seq OWNED BY games.id;


--
-- TOC entry 175 (class 1259 OID 87707)
-- Name: giveaways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE giveaways (
    amount bigint NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    user_id bigint NOT NULL,
    id bigint NOT NULL
);


--
-- TOC entry 183 (class 1259 OID 95862)
-- Name: giveaways_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE giveaways_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 2901 (class 0 OID 0)
-- Dependencies: 183
-- Name: giveaways_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE giveaways_id_seq OWNED BY giveaways.id;





--
-- TOC entry 176 (class 1259 OID 87711)
-- Name: plays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE plays (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    cash_out bigint,
    auto_cash_out bigint NOT NULL,
    game_id bigint NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    bet bigint,
    bonus bigint
);


--
-- TOC entry 177 (class 1259 OID 87715)
-- Name: plays_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE plays_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 2902 (class 0 OID 0)
-- Dependencies: 177
-- Name: plays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE plays_id_seq OWNED BY plays.id;


--
-- TOC entry 178 (class 1259 OID 87717)
-- Name: recovery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE recovery (
    id uuid NOT NULL,
    user_id bigint NOT NULL,
    created timestamp with time zone DEFAULT now()
);


--
-- TOC entry 179 (class 1259 OID 87720)
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE sessions (
    id uuid NOT NULL,
    user_id bigint NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    ott boolean DEFAULT false
);

CREATE TYPE UserClassEnum AS ENUM ('user', 'moderator', 'admin');

--
-- TOC entry 180 (class 1259 OID 87724)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE users (
    id bigint NOT NULL,
    created timestamp with time zone DEFAULT now() NOT NULL,
    username text NOT NULL,
    email text,
    password text NOT NULL,
    mfa_secret text,
    balance_satoshis bigint DEFAULT 0 NOT NULL,
    userclass UserClassEnum DEFAULT 'user' NOT NULL,
    CONSTRAINT users_balance_satoshis_check CHECK ((balance_satoshis >= 0))
);


--
-- TOC entry 181 (class 1259 OID 87733)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 2903 (class 0 OID 0)
-- Dependencies: 181
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- TOC entry 182 (class 1259 OID 87891)
-- Name: users_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW users_view AS
 SELECT u.id,
    u.created,
    u.username,
    u.email,
    u.password,
    u.mfa_secret,
    u.balance_satoshis,
    ( SELECT max(giveaways.created) AS max
           FROM giveaways
          WHERE (giveaways.user_id = u.id)) AS last_giveaway,
    u.userclass
   FROM users u;



CREATE TABLE game_hashes
(
 game_id bigint NOT NULL,
 hash text NOT NULL,
 CONSTRAINT game_hashes_pkey PRIMARY KEY (game_id)
);


--
-- TOC entry 2739 (class 2604 OID 87739)
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY fundings ALTER COLUMN id SET DEFAULT nextval('fundings_id_seq'::regclass);


--
-- TOC entry 2742 (class 2604 OID 87740)
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY games ALTER COLUMN id SET DEFAULT nextval('games_id_seq'::regclass);


--
-- TOC entry 2744 (class 2604 OID 95864)
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY giveaways ALTER COLUMN id SET DEFAULT nextval('giveaways_id_seq'::regclass);


--
-- TOC entry 2746 (class 2604 OID 87741)
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY plays ALTER COLUMN id SET DEFAULT nextval('plays_id_seq'::regclass);


--
-- TOC entry 2752 (class 2604 OID 87742)
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- TOC entry 2755 (class 2606 OID 87744)
-- Name: bv_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY blocks
    ADD CONSTRAINT bv_blocks_pkey PRIMARY KEY (height, hash);


--
-- TOC entry 2757 (class 2606 OID 87746)
-- Name: fundings_user_id_bitcoin_deposit_txid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fundings
    ADD CONSTRAINT fundings_user_id_bitcoin_deposit_txid_key UNIQUE (user_id, bitcoin_deposit_txid);


--
-- TOC entry 2762 (class 2606 OID 87748)
-- Name: games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- TOC entry 2766 (class 2606 OID 87750)
-- Name: plays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY plays
    ADD CONSTRAINT plays_pkey PRIMARY KEY (id);


--
-- TOC entry 2770 (class 2606 OID 87938)
-- Name: recovery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY recovery
    ADD CONSTRAINT recovery_pkey PRIMARY KEY (id);


--
-- TOC entry 2760 (class 2606 OID 87752)
-- Name: transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fundings
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 2773 (class 2606 OID 87941)
-- Name: unique_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY sessions
    ADD CONSTRAINT unique_id PRIMARY KEY (id);


--
-- TOC entry 2777 (class 2606 OID 87754)
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 2768 (class 1259 OID 87755)
-- Name: fki_foreing_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fki_foreing_user_id ON recovery USING btree (user_id);


--
-- TOC entry 2758 (class 1259 OID 87756)
-- Name: fundings_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fundings_user_id_idx ON fundings USING btree (user_id);


--
-- TOC entry 2763 (class 1259 OID 87757)
-- Name: giveaways_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX giveaways_user_id_idx ON giveaways USING btree (user_id);


--
-- TOC entry 2764 (class 1259 OID 87758)
-- Name: plays_game_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plays_game_id_idx ON plays USING btree (game_id);


--
-- TOC entry 2767 (class 1259 OID 87759)
-- Name: plays_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plays_user_id_idx ON plays USING btree (user_id, id DESC);


--
-- TOC entry 2771 (class 1259 OID 87930)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_idx ON sessions USING btree (user_id);


--
-- TOC entry 2774 (class 1259 OID 87760)
-- Name: unique_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_username ON users USING btree (lower(username));


--
-- TOC entry 2775 (class 1259 OID 87942)
-- Name: user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_id_idx ON users USING btree (id);


--
-- TOC entry 2782 (class 2606 OID 87761)
-- Name: foreing_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY recovery
    ADD CONSTRAINT foreing_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2778 (class 2606 OID 87766)
-- Name: fundings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY fundings
    ADD CONSTRAINT fundings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2779 (class 2606 OID 87771)
-- Name: giveaways_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY giveaways
    ADD CONSTRAINT giveaways_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2780 (class 2606 OID 87776)
-- Name: plays_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY plays
    ADD CONSTRAINT plays_game_id_fkey FOREIGN KEY (game_id) REFERENCES games(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 2781 (class 2606 OID 87781)
-- Name: plays_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY plays
    ADD CONSTRAINT plays_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


CREATE MATERIALIZED VIEW leaderboard AS
 WITH t AS (
         SELECT user_id,
            (COALESCE(sum(cash_out - bet), 0::numeric) + COALESCE(sum(bonus), 0::numeric))::bigint AS gross_profit,
            (COALESCE(sum(cash_out), 0::numeric) + COALESCE(sum(bonus), 0::numeric) - COALESCE(sum(bet), 0::numeric))::bigint AS net_profit,
            count(*) AS games_played
           FROM plays
          GROUP BY user_id
        )
 SELECT t.user_id,
    (SELECT username FROM users WHERE users.id = user_id),
    t.gross_profit,
    t.net_profit,
    t.games_played,
    rank() OVER (ORDER BY t.gross_profit DESC) AS rank
   FROM t;

CREATE UNIQUE INDEX leaderboard_user_id_idx
  ON leaderboard
  USING btree
  (user_id);