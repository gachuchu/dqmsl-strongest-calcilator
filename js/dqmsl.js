(() => {
  //--------------------------------------------------------------------
  // モンスターパラメータ
  class MonsParam {
    static Keys = ['hp', 'mp', 'atk', 'def', 'spd', 'int'];
    static Max = MonsParam.Keys.length;
    static Index = MonsParam.Keys.map((v, i) => ({[v]:i})).reduce((l, r) => Object.assign(l, r), {});

    constructor(target_param, param) {
      // 対象
      if(target_param instanceof MonsParam) {
        this.target = [...target_param.target];
      }else if(target_param instanceof Array) {
        this.target = [...target_param];
      }else{
        this.target = new Array(MonsParam.Max).fill(true);
        if(target_param instanceof Object) {
          for(const key in target_param) {
            this.target[MonsParam.Index[key]] = target_param[key];
          }
        }
      }

      // パラメータ
      if(param instanceof MonsParam) {
        this.params = [...param.params];
      }else if(param instanceof Array) {
        this.params = [...param];
      }else{
        this.params = new Array(MonsParam.Max).fill(0);
        if(param instanceof Object) {
          for(const key in param) {
            this.params[MonsParam.Index[key]] = param[key];
          }
        }
      }
      this.sum = this.params.reduce((a, b) => { return a + b; });
      this.key = this.params.map((e, i) => { return MonsParam.Keys[i]+e; }).filter((e, i) => { return this.target[i]; }).join('_');
    }
    // 同一パラメータ判定
    isEqual(param) {
      for(let i = 0; i < MonsParam.Max; ++i) {
        if(this.target[i] && this.params[i] !== param.params[i]) {
          return false;
        }
      }
      return true;
    }
    // 以上
    isGreaterThanOrEqual(param) {
      for(let i = 0; i < MonsParam.Max; ++i) {
        if(this.target[i] && this.params[i] < param.params[i]) {
          return false;
        }
      }
      return true;
    }
    // パワーアップ増分のパラメータを作成
    CreatePowerUpParam() {
      return new MonsParam(this.target, this.params.map(p => Math.ceil(p * 0.02)));
    }
    // 転生持越し分のパラメータを作成
    CreateTransParam(sotai) {
      return new MonsParam(this.target, this.params.map((p, i) => { return Math.ceil((p - sotai.params[i]) * 0.2); }));
    }
    // パラメータの足し算
    Add(param) {
      return new MonsParam(this.target, this.params.map((p, i) => { return p + param.params[i]; }));
    }
    // パラメータ取得
    GetParam(param) {
      return this.params[MonsParam.Index[param]];
    }
    // 合計とパラメータキー
    get sum() { return this._sum; }
    get key() { return this._key; }
    set sum(v) { this._sum = v; }
    set key(v) { this._key = v; }
  };

  //--------------------------------------------------------------------
  // モンスタークラス
  class Mons {
    static Type = {
      Sotai : 0,
      Trans : 1,
      Powerup : 2,
    };
    constructor(target_param, depth, rank, star, name, param, sotai, base, sozai) {
      this.target_param = target_param;
      this.depth = depth;
      this.rank = rank;
      this.star = star;
      this.mons_name = name;
      this.sotai = (typeof(sotai) === "undefined") ? this : sotai;
      this.base = base;
      this.sozai = sozai;
      this.is_special = false;
      this.param = new MonsParam(this.target_param, param);
      if(typeof(base) === "undefined") {
        this.type = Mons.Type.Sotai;
      }else if(typeof(sozai) === "undefined") {
        this.type = Mons.Type.Trans;
      }else {
        this.type = Mons.Type.Powerup;
      }
      this.CalcNeedMonsNum();
      this.powerup = this.param.CreatePowerUpParam();
      this.trans = this.param.CreateTransParam(this.sotai.param);
      this.CreateRecipeString();
    }
    // パラメータ取得
    GetParam(param) {
      return this.param.GetParam(param);
    }

    // 必要モンスター数を計算（ついでに特殊合体情報も継承）
    CalcNeedMonsNum() {
      this.need_depth = new Array(this.depth+1).fill(0);
      switch(this.type) {
        case Mons.Type.Sotai:
        this.need_mons = 1;
        this.check_special = { [this.depth] : 1 };
        this.need_depth[this.depth] = 1;
        break;

        case Mons.Type.Trans:
        this.need_mons = this.base.need_mons;
        this.check_special = { [this.depth] : 1 };
        for(let i = this.depth-1; i >= 0; --i) {
          this.need_depth[i] = this.base.need_depth[i];
        }
        this.is_special |= this.base.is_special;
        break;

        case Mons.Type.Powerup:
        this.need_mons = this.base.need_mons + this.sozai.need_mons;
        this.check_special = { [this.depth] : this.base.check_special[this.base.depth] + this.sozai.check_special[this.sozai.depth] };
        this.need_depth[this.depth] = this.base.need_depth[this.depth] + this.sozai.need_depth[this.depth];
        for(let i = this.depth-1; i >= 0; --i) {
          this.need_depth[i] = this.base.need_depth[i] + this.sozai.need_depth[i];
        }
        this.is_special |= (this.base.is_special | this.sozai.is_special);
        break;

        default:
        break;
      }
    }
    // レシピ用文字列の作成と特殊合体モンスターかの判定
    CreateRecipeString() {
      this.recipe_str = `☆${this.star}`;
      switch(this.type) {
        case Mons.Type.Sotai:
        this.base_recipe_str_ary = ['+0'.repeat(this.depth)];
        this.sozai_recipe_str_ary = ['+0'.repeat(this.depth)];
        break;

        case Mons.Type.Trans:
        this.base_recipe_str_ary = [`+${this.base.star}`, ...this.base.base_recipe_str_ary];
        if(this.is_special) {
          this.sozai_recipe_str_ary = [`+${this.base.star}`, ...this.base.sozai_recipe_str_ary];
        }else {
          this.sozai_recipe_str_ary = [`+${this.base.star}`, ...this.base.sozai_recipe_str_ary];
        }
        break;

        case Mons.Type.Powerup:
        this.base_recipe_str_ary = [...this.base.base_recipe_str_ary];
        this.sozai_recipe_str_ary = [...this.base.sozai_recipe_str_ary];
        break;

        default:
        break;
      }
      if(!this.is_special && this.check_special[this.depth] > this.star+1) {
        // 特殊
        this.sozai_recipe_str_ary[this.sozai_recipe_str_ary.length - 1] = this.sozai_recipe_str_ary[this.sozai_recipe_str_ary.length - 1] + '*';
        this.is_special = true;
      }
    }
    // パワーアップしたモンスターを作成する
    PowerUp(sozai) {
      return new Mons(this.target_param,
                      this.depth,
                      this.rank,
                      this.star+1,
                      this.mons_name,
                      this.param.Add(this.powerup).Add(sozai.powerup),
                      this.sotai,
                      this,
                      sozai);
    }
    // 転生したモンスターを作成する
    Trans(depth, rank, sotai, name) {
      return new Mons(this.target_param,
                      depth,
                      rank,
                      0,
                      name,
                      sotai.param.Add(this.trans),
                      sotai,
                      this);
    }
    // レシピをツリー表示
    LogRecipeTreeString(depth) {
      console.log(''.padStart(depth*2, ' ') + '└' + `☆${this.star} - ${this.param.key} - ${this.need_mons}体`);
      if(typeof(this.base) !== "undefined") {
        this.base.LogRecipeTreeString(depth+1);
      }
      if(typeof(this.sozai) !== "undefined") {
        this.sozai.LogRecipeTreeString(depth+1);
      }
    }
    // ベースとしての素材テキストを取得
    GetBaseRecipeString() {
      return `${this.recipe_str}${this.base_recipe_str_ary.join('')}(${this.need_mons}/${this.need_depth.map(i => i).reverse().join(',')})`;
    }
    // 素材としてのレシピテキストを取得
    GetSozaiRecipeString() {
      return `${this.recipe_str}${this.sozai_recipe_str_ary.join('')}(${this.need_mons}/${this.need_depth.map(i => i).reverse().join(',')})`;
    }
    // レシピ配列を取得
    GetRecipeStringArraySub(indent) {
      const prefix = ''.padStart(indent, ' ');
      let ret = [];
      if(typeof(this.base) !== "undefined") {
        ret = [...ret, ...this.base.GetRecipeStringArraySub(indent)];
        if(typeof(this.sozai) !== "undefined") {
          ret = [...ret, `${prefix}${this.base.GetBaseRecipeString()}  +  ${this.sozai.GetSozaiRecipeString()}`];
          if(this.sozai.is_special) {
            const add_indent = `${prefix}${this.base.GetBaseRecipeString()}  +  `.length + 1;
            ret = [...ret, this.sozai.GetRecipeStringArray(add_indent)];
          }
        }else{
          ret = [...ret, `${prefix}${this.base.GetBaseRecipeString()}${this.base.mons_name}`, `${prefix}↓`];
        }
      }
      return ret;
    }
    // レシピ配列を取得
    GetRecipeStringArray(indent = 0) {
      const prefix = ''.padStart(indent, ' ');
      let ret = this.GetRecipeStringArraySub(indent);
      ret = [...ret, `${prefix}${this.GetBaseRecipeString()}${this.mons_name}`];
      return ret;
    }
  };

  //--------------------------------------------------------------------
  // 指定の星のモンスターで作成意味のあるもののみ全て作成
  const CreateStarMons = (target_star, mons_data) => {
    // パワーアップが同じ素材は安いのだけにする
    let sozai_alist = {};
    mons_data.flat().forEach((sozai) => {
      let key = sozai.powerup.key;
      if(false
         || !(key in sozai_alist)
         || (sozai.powerup.isEqual(sozai_alist[key].powerup) && sozai.need_mons < sozai_alist[key].need_mons)
         ) {
        sozai_alist[key] = sozai;
      }
    });
    
    // 最強、パワーアップ候補、転生候補を残して入れ替える
    let alist = {};
    let base_star = target_star - 1;

    mons_data[base_star].forEach((base) => {
      Object.values(sozai_alist).forEach((sozai) => {
        let mons = base.PowerUp(sozai);
        let key = mons.param.key;
        if(false
           || !(key in alist)
           || (mons.param.isEqual(alist[key].param) && mons.need_mons < alist[key].need_mons)
           ) {
          alist[key] = mons;
        }
      });
    });
    let ret = Object.values(alist);
    return ret;
  };

  //--------------------------------------------------------------------
  // 計算開始
  document.querySelector('#calc').onclick = () => {
    let tree = [];
    const target_param = [...document.querySelectorAll('#target_param input')].map(v => ({[v.name]:v.checked})).reduce((l, r) => Object.assign(l, r), {});

    document.querySelectorAll('div#dst table').forEach((tbl, depth) => {
      // 素体の情報を取得
      let sotai = new Mons(
        target_param,
        depth,
        depth,
        0,
        tbl.querySelector('tr.kind input').value,
        MonsParam.Keys.map((p) => ({[p]:Number(tbl.querySelector('tr.'+p).cells[1].querySelector('input').value)})).reduce((l, r) => Object.assign(l, r), {}),
        );
      // 合計を記入
      tbl.rows[7].cells[1].innerHTML = sotai.param.sum;

      // ☆0～☆4までの情報を全て作成
      let mons_data = [];

      // ☆0の情報を作成
      mons_data[0] = [sotai];
      if(depth > 0) {
        // 転生元モンスターで最低限の転生差分だけ☆0転生を追加
        let zero_alist = {};
        tree[depth-1].flat().forEach((mons) => {
          let key = mons.trans.key;
          if(true
             && mons.trans.sum > 0
             && (false
                 || !(key in zero_alist)
                 || (mons.trans.isEqual(zero_alist[key].trans) && mons.need_mons < zero_alist[key].need_mons)
                 )
             ) {
            zero_alist[key] = mons;
          }
        });
        mons_data[0] = [...mons_data[0],
                        ...Object.values(zero_alist).map((m) => {
                          return new Mons(target_param,
                                          depth,
                                          depth,
                                          0,
                                          sotai.mons_name,
                                          sotai.param.Add(m.trans),
                                          sotai,
                                          m);
                        })
                        ];
      }

      // ☆1～4の情報を作成
      for(let star = 1; star <= 4; ++star) {
        mons_data[star] = CreateStarMons(star, mons_data);
      }

      // 表を埋める
      // 通常の☆1～☆4
      for(let star = 1; star <= 4; ++star) {
        const mons = mons_data[star][0];
        MonsParam.Keys.forEach((p) => {
          tbl.querySelector('tr.'+p).cells[1 + star].innerHTML = mons.GetParam(p);
        });
      }
      // 最強
      let strong = mons_data.flat().sort((a, b) => {
        if(a.param.sum > b.param.sum) {
          return -1;
        }else if(a.param.sum < b.param.sum) {
          return 1;
        }
        if(a.need_mons < b.need_mons) {
          return -1;
        }else if(a.need_mons > b.need_mons) {
          return 1;
        }
        if(a.star > b.star) {
          return -1;
        }else if(a.star < b.star) {
          return 1;
        }
        return 0;
      })[0];
      MonsParam.Keys.forEach((p) => {
        const tr = tbl.querySelector('tr.'+p);
        tr.cells[1+4+1].innerHTML = strong.GetParam(p); // 最強
        tr.cells[1+4+2].innerHTML = '+' + (strong.GetParam(p) - mons_data[4][0].GetParam(p)); // ☆４と最強の差分
      });

      // レシピ貼り付け
      tbl.rows[1].cells[8].querySelector('pre.recipe').innerText = strong.GetRecipeStringArray().flat(depth+1).join("\n");

      tree[depth] = mons_data;
    });
  };

  //--------------------------------------------------------------------
  // テーブルの追加削除
  const table_reset = () => {
    document.querySelector('div#dst').innerHTML = '';
  }
  const table_add = (num = 1) => {
    for(let i = 0; i < num; ++i) {
      let tbl = document.querySelector('div#src table').cloneNode(true);
      document.querySelector('div#dst').append(tbl);
    }
  };
  const table_del = (num = 1) => {
    for(let i = 0; i < num; ++i) {
      document.querySelector('div#dst table:last-child').remove();
    }
  };

  // リセット
  document.querySelector('#reset').onclick = () => {
    table_reset();
    document.querySelectorAll('#target_param input').forEach((cb, idx) => {
      cb.checked = true;
    });
    UpdateTargetCheckbox();
  };
  // 追加
  document.querySelector('#add').onclick = () => {
    table_add();
  };
  // 削除
  document.querySelector('#del').onclick = () => {
    table_del();
  };
  // 1段階
  document.querySelector('#trans1').onclick = () => {
    table_reset();
    table_add(1);
  };
  // 2段階
  document.querySelector('#trans2').onclick = () => {
    table_reset();
    table_add(2);
  };
  // 3段階
  document.querySelector('#trans3').onclick = () => {
    table_reset();
    table_add(3);
  };

  //--------------------------------------------------------------------
  // ロード
  document.querySelector('#load').onclick = () => {
    let load_text = document.querySelector('textarea#load_text').value.split(/\r\n|\r|\n/).filter(Boolean);
    if(load_text.length <= 0) {
      return;
    }
    table_reset();
    table_add(load_text.length);
    load_text.forEach((v, idx) => {
      const mons_data = v.split(' ');
      const tbl = document.querySelectorAll('div#dst table')[idx];
      mons_data.forEach((p, i) => {
        tbl.rows[i].querySelector('input').value = p;
      });
    });
  };

  //--------------------------------------------------------------------
  // 対象パラメータチェック
  // 更新
  const UpdateTargetCheckbox = () => {
    const all = document.querySelector('input[name=all]');
    const check_list = [...document.querySelectorAll('#target_param input')].map(v => v.checked);
    const check_num = check_list.reduce((a, v) => { return a + (v ? 1 : 0); }, 0);
    if(check_num == check_list.length) {
      all.checked = true;
      all.disabled = true;
    }else{
      all.checked = false;
      all.disabled = false;
    }
    // テーブルにクラスをつける
    document.querySelectorAll('table').forEach((tbl, idx) => {
      tbl.querySelectorAll('tr').forEach((tr, idx) => {
        if(idx == 0 || idx == 7) {
          tr.classList.remove('disabled');
          return true;
        }
        if(check_list[idx-1]) {
          tr.classList.remove('disabled');
        }else{
          tr.classList.add('disabled');
        }
      });
    });
  };
  // all
  document.querySelector('input[name=all]').onchange = (ev) => {
    const elm = ev.target;
    if(elm.checked) {
      document.querySelectorAll('#target_param input').forEach((cb, idx) => {
        cb.checked = true;
      });
    }
    UpdateTargetCheckbox();
  };
  // 各種パラメータ
  document.querySelectorAll('#target_param input[type=checkbox]').forEach((ipt) => {
    ipt.onchange = (ev) => {
      const elm = ev.target;
      const check_num = [...document.querySelectorAll('#target_param input')].reduce((a, v) => { return a + (v.checked ? 1 : 0); }, 0);
      if(check_num < 1) {
        // 最後の1個はチェックオフさせない
        elm.checked = true;
      }
      UpdateTargetCheckbox();
    };
  });

  UpdateTargetCheckbox();

  //--------------------------------------------------------------------
  // 高さ変更判定
  if(window.parent) {
    const mo = new MutationObserver((mr) => {
      window.parent.postMessage(['dqmsl_set_iframe_height', document.getElementsByTagName('html')[0].scrollHeight], '*');
    });
    mo.observe(document.body, { childList:true, subtree: true, });
  }
})();
