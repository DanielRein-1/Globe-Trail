import { z } from 'zod';
import { countryCodeSchema } from './country';
import { referenceSchema } from '../destinations/contracts';

// ISO 3166-1 alpha-2 assignments, not arbitrary two-letter strings.
const countries = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));
export const destinationCountrySchema = countryCodeSchema.refine(code => countries.has(code), 'Use an assigned ISO country code');
export const destinationQuerySchema = z.strictObject({
  countryCode: destinationCountrySchema,
  query: z.string().max(200).trim().normalize('NFC').refine(value =>
    !/[\p{Cc}\p{Cf}]/u.test(value) && [...value.replace(/\s/gu, '')].length >= 3 && [...value].length <= 100,
  'Enter 3–100 characters, including at least three visible characters'),
});
export const destinationSelectionSchema = z.strictObject({ countryCode: destinationCountrySchema, reference: referenceSchema });
export function readDestinationQuery(params: URLSearchParams) {
  const allowed = new Set(['countryCode', 'query']);
  const values: Record<string, unknown> = Object.create(null);
  for (const key of new Set(params.keys())) {
    if (!allowed.has(key)) return destinationQuerySchema.safeParse(null);
    const all = params.getAll(key);
    values[key] = all.length === 1 ? all[0] : all;
  }
  return destinationQuerySchema.safeParse(values);
}
